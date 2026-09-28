import numpy as np, subprocess, json, wave
FF='/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'
SR=44100; DUR=62.4; N=int(SR*DUR); rng=np.random.default_rng(7)
def load(p):
    raw=subprocess.run([FF,'-loglevel','error','-i',p,'-f','f32le','-ac','1','-ar',str(SR),'-'],capture_output=True).stdout
    return np.frombuffer(raw,dtype=np.float32).copy()
def put(buf,x,t,g=1.0):
    i=int(t*SR); x=x[:max(0,len(buf)-i)]; buf[i:i+len(x)]+=x*g
def onepole(x,a):  # lowpass, a in (0,1) smaller=darker
    y=np.empty_like(x); s=0.0
    for i in range(len(x)): s+=a*(x[i]-s); y[i]=s
    return y
T=lambda d: np.arange(int(d*SR))/SR
VO=[(0.3,1),(5.4,2),(10.55,3),(16.35,4),(23.4,5),(30.6,6),(38.4,7),(44.25,8),(50.45,9),(57.75,10)]
vo=np.zeros(N,np.float32)
for t,i in VO: put(vo,load(f'vo/s{i}.mp3'),t)
vo/=np.abs(vo).max()+1e-9; vo*=0.89

# ---------- music ----------
bpm=112; beat=60/bpm; bar=4*beat
mus=np.zeros(N)
def note(f,d,amp=1.0,att=.6,rel=1.2,harm=6,det=.004):
    t=T(d+rel); x=np.zeros_like(t)
    for h in range(1,harm+1):
        for dd in (-det,det): x+=np.sin(2*np.pi*f*h*(1+dd)*t+rng.random()*6)/h**1.6
    env=np.minimum(1,t/att)*np.where(t<d,1,np.exp(-(t-d)/rel*4)); return x*env*amp
mid=lambda m:440*2**((m-69)/12)
prog=[[57,60,64,67,71],[53,57,60,64,69],[48,55,60,64,67],[55,59,62,67,69]]  # Am9 Fmaj7 Cadd9 G6
pad=np.zeros(N)
t=0.0;k=0
while t<55.2:
    ch=prog[k%4]; d=min(2*bar,55.4-t)
    for m in ch: put(pad,note(mid(m),d,.05),t)
    put(pad,note(mid(ch[0]-24),d,.12,att=.3,harm=3),t)
    t+=2*bar;k+=1
pad=onepole(pad,.08)
mus+=pad
# ending chord
for m in [45,57,64,67,71,76]: put(mus,onepole(note(mid(m),3.2,.06 if m>50 else .14,att=.05,rel=1.6),.1),57.7)
# drums: soft kick & hats from 5s to 55s
def kick():
    t=T(.35); f=50+90*np.exp(-t*30); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*9)
def hat():
    t=T(.05); n=rng.standard_normal(len(t)); n=n-onepole(n,.5); return n*np.exp(-t*90)
K_=kick()
bt=5.0
while bt<55.0:
    put(mus,K_,bt,.22 if bt>10 else .12); put(mus,hat(),bt+beat/2,.05); bt+=beat
# sidechain duck under VO
env=np.abs(vo); win=int(.12*SR); env=np.convolve(env,np.ones(win)/win,'same'); env=env/env.max()
duck=1-.45*np.clip(env*4,0,1)
mus*=duck
mus/=np.abs(mus).max(); mus*=.24

# ---------- sfx ----------
sfx=np.zeros(N)
def click():
    t=T(.06); return (np.sin(2*np.pi*2200*t)*np.exp(-t*120)+ .6*rng.standard_normal(len(t))*np.exp(-t*400))
def whoosh(d=.5):
    t=T(d); n=rng.standard_normal(len(t)); env=np.sin(np.pi*t/d)**2
    a=np.clip(.02+.25*np.sin(np.pi*t/d),0,1); y=np.empty_like(n); s=0
    for i in range(len(n)): s+=a[i]*(n[i]-s); y[i]=s
    return y*env
def tick(): t=T(.03); return np.sin(2*np.pi*1500*t)*np.exp(-t*200)
def pop():
    t=T(.09); f=500+900*t/.09; return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*40)
def key(): t=T(.02); return rng.standard_normal(len(t))*np.exp(-t*350)
def boom():
    t=T(2.0); f=38+60*np.exp(-t*12); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*2.2)
def chime():
    t=T(.6); return sum(np.sin(2*np.pi*f*t)*np.exp(-t*7) for f in (1318.5,1975.5))
S=json.load(open('sfx.json'))
for t in S['click']: put(sfx,click(),t,.5)
for t in S['whoosh']: put(sfx,whoosh(),t-.15,.35)
for t in S['tick']: put(sfx,tick(),t,.18)
for t in S['pop']: put(sfx,pop(),t,.16)
for a,b in S['type']:
    t=a
    while t<b: put(sfx,key(),t,.12); t+=.035+rng.random()*.05
for t in S['boom']: put(sfx,boom(),t,.7)
for t in S['hmr']: put(sfx,chime(),t,.12)

r=lambda x:20*np.log10(np.sqrt(np.mean(x[np.abs(vo)>0.02]**2))+1e-9)
print("rms vo",r(vo),"mus",r(mus),"sfx",r(sfx))
mix=vo+mus+sfx
# fades
fi=int(.15*SR); mix[:fi]*=np.linspace(0,1,fi); fo=int(1.0*SR); mix[-fo:]*=np.linspace(1,0,fo)
mix=np.tanh(mix*1.1)/np.tanh(1.1)
mix*=0.93/np.abs(mix).max()
pcm=(mix*32767).astype(np.int16)
w=wave.open('mix.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
print('ok',len(mix)/SR)
