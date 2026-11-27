# 부스터 계기판 시안 v9 (근사 렌더, 원작 이미지 미사용). 실행: python3 gen_v9.py
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
W,H=432,514; CX,CY=216,257; NF,NB=30,6; N=NF+NB; S=2; A_START=60  # 5시 방향에서 시작, 시계방향
RIN,ROUT=30,340; GAP=1.1; RND=7  # 칸 사이 틈 1.1°(v5와 같음) / 모서리 라운드(블러 반경)
SEG={'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg'}
YEL=(255,214,30); BW=7  # 휴식 테두리 두께(px)
def wedge(d,r0,r1,a0,a1,fill):
    n=max(3,int(abs(a1-a0)/1.0)); pts=[]
    for k in range(n+1):
        a=math.radians(a0+(a1-a0)*k/n); pts.append(((CX+r1*math.cos(a))*S,(CY+r1*math.sin(a))*S))
    for k in range(n,-1,-1):
        a=math.radians(a0+(a1-a0)*k/n); pts.append(((CX+r0*math.cos(a))*S,(CY+r0*math.sin(a))*S))
    d.polygon(pts,fill=fill)
_CACHE={}
def _wedge_assets():
    if _CACHE: return _CACHE
    step=360/N; rings=48
    for i in range(N):
        a0=-(i+1)*step+GAP/2; a1=-i*step-GAP/2
        brk=i>=NF
        m=Image.new('L',(W*S,H*S),0); wedge(ImageDraw.Draw(m),RIN+3,ROUT,a0,a1,255)
        m=m.filter(ImageFilter.GaussianBlur(RND*S/2)).point(lambda v:255 if v>150 else (0 if v<100 else int((v-100)*255/50)))  # 모서리 둥글게
        on=Image.new('RGB',(W*S,H*S)); d=ImageDraw.Draw(on)
        for j in range(rings):
            t=j/(rings-1); r0=RIN+(ROUT-RIN)*j/rings; r1=RIN+(ROUT-RIN)*(j+1)/rings+0.8
            col=(int(10+30*t),int(85+95*t),int(40+30*t)) if brk else (int(75+85*t),int(5+14*t),int(8+10*t))
            wedge(d,r0,r1,a0,a1,col)
        off=Image.new('RGB',(W*S,H*S),(6,22,12) if brk else (24,5,7))
        _CACHE[i]=(m,on,off)
    return _CACHE
def gauge(off):
    A=_wedge_assets(); L=Image.new('RGB',(W*S,H*S))
    for i in range(N):
        m,on,of=A[i]; L.paste(of if i<off else on,(0,0),m)
    return L.resize((W,H),Image.LANCZOS)
def glow(layer,r,k):
    b=layer.filter(ImageFilter.GaussianBlur(r)).point(lambda v:min(255,int(v*k)))
    return ImageChops.add(b,layer)
def sevenseg(d,ch,x,y,w,h,t,col,dim,sh=0.15):
    m=h/2;g=1.2
    def hz(yc):return [(x+t/2+g,yc),(x+t+g,yc-t/2),(x+w-t-g,yc-t/2),(x+w-t/2-g,yc),(x+w-t-g,yc+t/2),(x+t+g,yc+t/2)]
    def vt(xc,y0,y1):return [(xc,y0+t/2+g),(xc+t/2,y0+t+g),(xc+t/2,y1-t-g),(xc,y1-t/2-g),(xc-t/2,y1-t-g),(xc-t/2,y0+t+g)]
    P={'a':hz(y+t/2),'g':hz(y+m),'d':hz(y+h-t/2),'f':vt(x+t/2,y,y+m),'b':vt(x+w-t/2,y,y+m),'e':vt(x+t/2,y+m,y+h),'c':vt(x+w-t/2,y+m,y+h)}
    for n,p in P.items():
        q=[(px+(y+h/2-py)*sh,py) for px,py in p]
        if n in SEG[ch]: d.polygon(q,fill=col)
        elif dim: d.polygon(q,fill=dim)
TX,TW=238,155  # 숫자 줄(기울기 포함) 가로 범위
_LF={}
def label_font():
    # FOCUS 가로폭이 숫자 줄 폭(TW)과 같아지는 글자 크기
    if _LF: return _LF['f']
    d=ImageDraw.Draw(Image.new('L',(10,10)))
    for sz in range(10,80):
        f=ImageFont.load_default(size=sz); bb=d.textbbox((0,0),"FOCUS",font=f)
        if bb[2]-bb[0]>TW: break
        _LF['f']=f; _LF['h']=bb[3]-bb[1]
    return _LF['f']
label_font(); BOXTOP=CY-70-14-_LF['h']-10
_BORDER={}
def rest_border():
    # 휴식 구간(3~5시)을 중심 호부터 화면 외곽까지 하나의 닫힌 선으로: 영역 마스크 - 안쪽으로 깎은 마스크
    if _BORDER: return _BORDER['y']
    R0=RIN-4; FAR=900; pts=[]
    for k in range(61): a=math.radians(k); pts.append(((CX+R0*math.cos(a))*S,(CY+R0*math.sin(a))*S))
    pts+=[((CX+FAR*math.cos(math.radians(60)))*S,(CY+FAR*math.sin(math.radians(60)))*S),((CX+FAR)*S,(CY+FAR*math.tan(math.radians(30)))*S),((CX+FAR)*S,CY*S)]
    sec=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(sec).polygon(pts,fill=255)
    scr=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(scr).rounded_rectangle((0,0,(W-1)*S,(H-1)*S),radius=80*S,fill=255)
    reg=ImageChops.multiply(sec,scr)
    reg=reg.filter(ImageFilter.GaussianBlur(3*S)).point(lambda v:255 if v>127 else 0)  # 꼭짓점 살짝 둥글게
    P=40; pad=Image.new('L',(W*S+2*P,H*S+2*P),0); pad.paste(reg,(P,P))  # 화면 끝도 깎이도록 바깥을 0으로 채움
    inner=pad.filter(ImageFilter.MinFilter(2*BW*S+1)).crop((P,P,P+W*S,P+H*S))
    ring=ImageChops.subtract(reg,inner)
    Y=Image.new('RGB',(W*S,H*S)); Y.paste(Image.new('RGB',(W*S,H*S),YEL),(0,0),ring)
    _BORDER['y']=Y.resize((W,H),Image.LANCZOS); return _BORDER['y']
def draw(mode,mm,ss,lit,hint=False):
    brk=mode=='break'
    base=gauge(lit)
    if lit<N:
        gl=glow(base.point(lambda v:v if v>60 else 0),9,1.3)
        base=ImageChops.add(base,gl.point(lambda v:int(v*0.5)))
    # 중심 구멍
    hole=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(hole).ellipse(((CX-RIN+4)*S,(CY-RIN+4)*S,(CX+RIN-4)*S,(CY+RIN-4)*S),fill=255)
    base=Image.composite(Image.new('RGB',(W,H),(0,0,0)),base,hole.resize((W,H),Image.LANCZOS))
    cm=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(cm).rounded_rectangle((0,0,(W-1)*S,(H-1)*S),radius=80*S,fill=255)
    cm=cm.resize((W,H),Image.LANCZOS); base=Image.composite(base,Image.new('RGB',(W,H)),cm)
    # 노란 네온: 화면 외곽선 + 중심 링만
    Y=rest_border()
    bk=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(bk).rounded_rectangle((228*S,BOXTOP*S,404*S,CY*S),radius=14*S,fill=255)
    base=Image.composite(Image.new('RGB',(W,H),(0,0,0)),base,bk.resize((W,H),Image.LANCZOS))
    Y=Image.composite(Y,Image.new('RGB',(W,H)),cm); base=ImageChops.add(base,Y); base=ImageChops.add(base,glow(Y,5,1.0).point(lambda v:int(v*0.6)))
    T=Image.new('RGB',(W,H)); d=ImageDraw.Draw(T)
    tc=(255,238,220); dm=(24,22,22); x0=242;y0=CY-70  # 숫자 아래가 휴식 테두리 윗선 근처
    for i,ch in enumerate(f"{mm:02d}"): sevenseg(d,ch,x0+i*40,y0,32,60,7,tc,dm)
    d.ellipse((x0+83,y0+16,x0+89,y0+22),fill=tc); d.ellipse((x0+83,y0+38,x0+89,y0+44),fill=tc)
    for i,ch in enumerate(f"{ss:02d}"): sevenseg(d,ch,x0+98+i*29,y0+22,22,38,5,tc,dm)
    # 라벨: 시간값 위, 숫자 줄과 같은 가로폭, 아래 노란 밑줄
    lab="REST" if brk else "FOCUS"; LW=TW
    fl=label_font(); bb=d.textbbox((0,0),lab,font=fl)
    ly=y0-14-(bb[3]-bb[1])
    d.text((TX-bb[0],ly-bb[1]),lab,font=fl,fill=YEL if brk else (235,228,218))
    d.rectangle((TX,y0-10,TX+LW,y0-7),fill=YEL)
    f2=ImageFont.load_default(size=15)
    if hint:
        c=(170,160,150)
        hy=BOXTOP-14  # 힌트는 시간 박스 위 한 줄: ^ 5~60 v
        d.line([(300,hy+5),(308,hy-3),(316,hy+5)],fill=c,width=2)
        d.text((324,hy-9),"5~60",font=f2,fill=(130,125,118))
        d.line([(370,hy-3),(378,hy+5),(386,hy-3)],fill=c,width=2)
    base=ImageChops.add(base,glow(T,5,0.9))
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).rounded_rectangle((0,0,W-1,H-1),radius=80,fill=255)
    out=Image.new('RGB',(W,H)); out.paste(base,(0,0),m); return out
def off_focus(rem,tot): return NF-math.ceil(rem/tot*NF)   # 집중: 켜진 칸=ceil(rem/tot*NF)
def off_break(rem,tot): return NF+(NB-math.ceil(rem/tot*NB))
if __name__=="__main__":
    draw('idle',25,0,0,True).save('01-idle-25.png')
    r=750; draw('focus',r//60,r%60,off_focus(r,1500)).save('02-focus-mid.png')
    r=70; draw('focus',r//60,r%60,off_focus(r,1500)).save('03-focus-almost.png')
    r=150; draw('break',r//60,r%60,off_break(r,300)).save('04-break.png')
    fr=[]; tot=1800; F=60
    for k in range(F+1):
        t=tot*k/F
        if t<1500: r=int(round(1500-t)); im=draw('focus',r//60,r%60,off_focus(r,1500))
        else: r=int(round(1800-t)); im=draw('break',r//60,r%60,off_break(max(r,1),300))
        fr.append(im.quantize(24,dither=Image.NONE))
    fr[0].save('05-cycle-preview.gif',save_all=True,append_images=fr[1:],duration=117,loop=0,optimize=True)
