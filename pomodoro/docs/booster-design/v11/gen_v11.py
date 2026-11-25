# 부스터 계기판 시안 v11 = v10 + 사용자 피드백 3가지. 실행: python3 gen_v11.py
# v11 변경: (1) 휴식 테두리의 중심 쪽 꼭짓점을 원작처럼 뾰족하게(허브 원호 → 뾰족한 끝, 윗변 y=257은 그대로)
#           (1') 0.1.5: 뾰족한 끝(꼭짓점)을 화면 중심(CX,CY)으로 옮김. 5시 쪽 변이 5시 방사선(60°) 그 자체가 되어
#                마지막 집중 칸·첫 휴식 칸도 다른 칸과 같은 중심·같은 틈의 파이 조각이 됨
#           (2) FOCUS/REST 밑줄 왼쪽 끝을 화면 중심(216,257) 쪽으로 꺾음(원작 숫자 위 브래킷 선)
#           (3) 휴식 마지막 칸(i=35, 3시~3시 아래 10°, 카운트다운에서 가장 늦게 꺼지는 칸)을 노란 네온색으로
# 이하 v10 설명:
# v9 대비 바뀐 것: 팔레트(원작 픽셀 샘플 기반), 칸 그라데이션(허브 쪽 에어브러시 감쇠 → 평평한 셀 레드),
# 켜진 칸 사이 이음선(검정 → 어두운 같은 색), 노란 네온(흰빛 코어 + 노랑 + 호박색 헤일로 2단),
# 7세그먼트(순백, 획 얇게, 따뜻한 글로우), 라벨 폰트(Barlow Semi Condensed ExtraBold Italic, 원작 'SEC.' 느낌).
# 좌표·칸 수·각도·테두리 두께·박스 위치는 v9와 동일.
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
W,H=432,514; CX,CY=216,257; NF,NB=30,6; N=NF+NB; S=2; A_START=60
RIN,ROUT=30,340; GAP=1.1; RND=7
SEG={'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg'}
BW=7  # 휴식 테두리 두께(px) v9와 동일
# ---- v10 팔레트 (원작 ref.png 샘플: 셀 레드 (201,39,28), 패널 그린 (115,222,117), 네온 코어 (254,246,106), 헤일로 (152,126,16)) ----
YEL=(255,214,36)        # 네온 몸통(밑줄·REST 라벨 기준색)
YEL_CORE=(255,246,120)  # 네온 코어(흰빛 노랑)
YEL_HALO=(190,118,12)   # 호박색 헤일로
RED_IN=(64,5,4); RED=(214,42,26); RED_OUT=(222,50,28)        # 허브 쪽 에어브러시 감쇠 → 거의 평평한 셀 레드(256색 양자화 밴딩 방지)
GRN_IN=(18,76,34); GRN=(115,224,116); GRN_OUT=(128,230,120)  # 원작 파스텔 패널 그린
YC_IN=(70,46,4); YC_OUT=(255,228,80)   # v11: 휴식 마지막 칸(노랑) 허브 쪽 / 바깥
YC_OFF_IN=(12,9,2); YC_OFF_OUT=(32,25,5)
LAST=N-1                # 휴식 마지막 칸 인덱스(0°~10°, 3시 바로 아래)
TIP_D=0                 # 휴식 테두리 뾰족한 끝 = 화면 중심(CX,CY). (0.1.4는 31px 오른쪽이라 5시 변이 방사선에서 어긋났음)
RED_OFF_IN=(12,2,2); RED_OFF_OUT=(30,6,5)
GRN_OFF_IN=(3,14,7); GRN_OFF_OUT=(7,30,14)
SEAM_K=0.50             # 켜진 칸 이음선 = 칸 색 × 0.50 (원작의 어두운 셀 경계선)
TC=(255,252,244); DM=(12,10,10)   # 숫자: 순백에 가까운 웜화이트 / 꺼진 세그먼트
FOCUS_C=(255,250,240)
FONT_PATH='/usr/share/fonts/truetype/sand-box/google/Barlow Semi Condensed/BarlowSemiCondensed-ExtraBoldItalic.ttf'
FONT_HINT='/usr/share/fonts/truetype/sand-box/google/Barlow Semi Condensed/BarlowSemiCondensed-SemiBold.ttf'
def _lerp(a,b,t): return tuple(int(round(a[i]+(b[i]-a[i])*t)) for i in range(3))
def _ss(t): t=max(0.0,min(1.0,t)); return t*t*(3-2*t)
def radial(r,cin,cmid,cout,knee=104):
    # 허브(RIN)~knee: 에어브러시처럼 부드럽게 밝아짐, knee~ROUT: 셀 톤 유지하며 바깥으로 살짝 밝아짐
    if r<knee: return _lerp(cin,cmid,_ss((r-RIN)/(knee-RIN)))
    return _lerp(cmid,cout,(r-knee)/(ROUT-knee))
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
    step=360/N; rings=64
    for i in range(N):
        a0=-(i+1)*step+GAP/2; a1=-i*step-GAP/2; brk=i>=NF
        m=Image.new('L',(W*S,H*S),0); wedge(ImageDraw.Draw(m),RIN+3,ROUT,a0,a1,255)
        m=m.filter(ImageFilter.GaussianBlur(RND*S/2)).point(lambda v:255 if v>150 else (0 if v<100 else int((v-100)*255/50)))
        sm=Image.new('L',(W*S,H*S),0); wedge(ImageDraw.Draw(sm),RIN+3,ROUT,a0-GAP/2,a1+GAP/2,255)  # 이음선 바탕(틈 포함)
        on=Image.new('RGB',(W*S,H*S)); of=Image.new('RGB',(W*S,H*S)); seam=Image.new('RGB',(W*S,H*S))
        d=ImageDraw.Draw(on); do=ImageDraw.Draw(of); dsm=ImageDraw.Draw(seam)
        for j in range(rings):
            r0=RIN+(ROUT-RIN)*j/rings; r1=RIN+(ROUT-RIN)*(j+1)/rings+0.8; rc=(r0+r1)/2
            if i==LAST: c=radial(rc,YC_IN,YEL,YC_OUT); co=_lerp(YC_OFF_IN,YC_OFF_OUT,(rc-RIN)/(ROUT-RIN))
            elif brk: c=radial(rc,GRN_IN,GRN,GRN_OUT); co=_lerp(GRN_OFF_IN,GRN_OFF_OUT,(rc-RIN)/(ROUT-RIN))
            else:   c=radial(rc,RED_IN,RED,RED_OUT); co=_lerp(RED_OFF_IN,RED_OFF_OUT,(rc-RIN)/(ROUT-RIN))
            wedge(d,r0,r1,a0-GAP,a1+GAP,c); wedge(do,r0,r1,a0-GAP,a1+GAP,co)
            wedge(dsm,r0,r1,a0-GAP,a1+GAP,tuple(int(v*SEAM_K) for v in c))
        if brk:  # 휴식 칸은 휴식 영역 안으로만(테두리 밖 화면 모서리 쪽 정리)
            rg=_rest_region(); m=ImageChops.multiply(m,rg); sm=ImageChops.multiply(sm,rg)
        _CACHE[i]=(m,on,of,sm,seam)
    return _CACHE
def gauge(off):
    A=_wedge_assets(); L=Image.new('RGB',(W*S,H*S))
    for i in range(N):  # 켜진 칸 아래에 어두운 이음선 깔기 (틈 각도 1.1°는 그대로)
        if i>=off: m,on,of,sm,seam=A[i]; L.paste(seam,(0,0),sm)
    for i in range(N):
        m,on,of,sm,seam=A[i]; L.paste(of if i<off else on,(0,0),m)
    return L.resize((W,H),Image.LANCZOS)
def glow(layer,r,k):
    b=layer.filter(ImageFilter.GaussianBlur(r)).point(lambda v:min(255,int(v*k)))
    return ImageChops.add(b,layer)
def tint(im,rgb):
    # 채널별 배율(0~1)로 색 입히기 (헤일로를 따뜻한 쪽으로)
    r,g,b=im.split(); return Image.merge('RGB',(r.point(lambda v:int(v*rgb[0])),g.point(lambda v:int(v*rgb[1])),b.point(lambda v:int(v*rgb[2]))))
def neon(mask_hi,core_px):
    """mask_hi: S배 크기 L 마스크(선 모양). 반환: (선 RGB, 헤일로 RGB) W×H.
    선 = 가장자리 노랑 YEL + 가운데 core_px 폭 흰빛 코어. 헤일로 = 좁은 호박색 + 넓은 옅은 주황."""
    P=40; pad=Image.new('L',(W*S+2*P,H*S+2*P),0); pad.paste(mask_hi,(P,P))
    e=max(1,int((BW-core_px)/2*S)); core=pad.filter(ImageFilter.MinFilter(2*e+1)).crop((P,P,P+W*S,P+H*S))
    core=core.filter(ImageFilter.GaussianBlur(S*0.8))
    line=Image.new('RGB',(W*S,H*S)); line.paste(Image.new('RGB',(W*S,H*S),YEL),(0,0),mask_hi)
    line.paste(Image.new('RGB',(W*S,H*S),YEL_CORE),(0,0),ImageChops.multiply(core,mask_hi))
    line=line.resize((W,H),Image.LANCZOS); mk=mask_hi.resize((W,H),Image.LANCZOS)
    hc=Image.new('RGB',(W,H)); hc.paste(Image.new('RGB',(W,H),YEL_HALO),(0,0),mk)
    halo=ImageChops.add(hc.filter(ImageFilter.GaussianBlur(3.5)).point(lambda v:min(255,int(v*1.35))),
                        tint(hc.filter(ImageFilter.GaussianBlur(12)),(0.9,0.5,0.15)).point(lambda v:int(v*0.85)))
    return line,halo
def sevenseg(d,ch,x,y,w,h,t,col,dim,sh=0.15):
    m=h/2;g=1.2
    def hz(yc):return [(x+t/2+g,yc),(x+t+g,yc-t/2),(x+w-t-g,yc-t/2),(x+w-t/2-g,yc),(x+w-t-g,yc+t/2),(x+t+g,yc+t/2)]
    def vt(xc,y0,y1):return [(xc,y0+t/2+g),(xc+t/2,y0+t+g),(xc+t/2,y1-t-g),(xc,y1-t/2-g),(xc-t/2,y1-t-g),(xc-t/2,y0+t+g)]
    P={'a':hz(y+t/2),'g':hz(y+m),'d':hz(y+h-t/2),'f':vt(x+t/2,y,y+m),'b':vt(x+w-t/2,y,y+m),'e':vt(x+t/2,y+m,y+h),'c':vt(x+w-t/2,y+m,y+h)}
    for n,p in P.items():
        q=[(px+(y+h/2-py)*sh,py) for px,py in p]
        if n in SEG[ch]: d.polygon(q,fill=col)
        elif dim: d.polygon(q,fill=dim)
TX,TW=238,155
LAB_H=35; BOXTOP=128   # v9 값 그대로 고정(라벨 높이 35px, 박스 윗변 128)
X0,Y0=242,CY-70
MAIN_T,SEC_T=6,4.5     # 세그먼트 획 두께 (v9: 7, 5) — 원작처럼 가늘게
def label_img(lab,col):
    """원작 'SEC.' 같은 굵은 이탤릭 산세리프. FOCUS 폭=TW, 글자 높이=LAB_H에 맞춰 래스터(4배 그린 뒤 축소)."""
    big=8*LAB_H; f=ImageFont.truetype(FONT_PATH,big)
    d=ImageDraw.Draw(Image.new('L',(10,10)))
    fb=d.textbbox((0,0),"FOCUS",font=f); sx=TW/(fb[2]-fb[0]); sy=LAB_H/(fb[3]-fb[1])
    bb=d.textbbox((0,0),lab,font=f); m=Image.new('L',(bb[2]-bb[0]+4,bb[3]-bb[1]+4),0)
    ImageDraw.Draw(m).text((2-bb[0],2-bb[1]),lab,font=f,fill=255)
    m=m.resize((max(1,round(m.width*sx)),max(1,round(m.height*sy))),Image.LANCZOS)
    return m
def gauge_frame(lit):
    """글자 없는 전체 게이지 프레임(앱 g00~g36에 해당). lit = 켜진 칸 수(0~36)."""
    off=N-lit
    base=gauge(off)
    if off<N:  # 셀 블룸: 밝은 부분만 번지게, 빨강은 주황 쪽으로 살짝 데움
        src=base.point(lambda v:v if v>70 else 0)
        # lighter(최댓값): 칸 자체는 원작 셀 톤 그대로 두고, 어두운 곳(꺼진 칸·허브·틈)으로만 번짐
        b1=src.filter(ImageFilter.GaussianBlur(9)).point(lambda v:int(v*0.55))
        b2=tint(src.filter(ImageFilter.GaussianBlur(26)),(0.36,0.20,0.12))  # b1+b2<1 → 칸 안쪽은 원래 셀 톤 유지(양자화 밴딩 방지)
        base=ImageChops.lighter(base,ImageChops.add(b1,b2))
    hole=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(hole).ellipse(((CX-RIN+4)*S,(CY-RIN+4)*S,(CX+RIN-4)*S,(CY+RIN-4)*S),fill=255)
    base=Image.composite(Image.new('RGB',(W,H)),base,hole.resize((W,H),Image.LANCZOS))
    cm=_screen_mask()
    base=Image.composite(base,Image.new('RGB',(W,H)),cm)
    bk=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(bk).rounded_rectangle((228*S,BOXTOP*S,404*S,CY*S),radius=14*S,fill=255)
    base=Image.composite(Image.new('RGB',(W,H)),base,bk.resize((W,H),Image.LANCZOS))
    line,halo=rest_border()
    line=Image.composite(line,Image.new('RGB',(W,H)),cm); halo=Image.composite(halo,Image.new('RGB',(W,H)),cm)
    base=ImageChops.add(ImageChops.screen(base,halo),line)
    out=Image.new('RGB',(W,H)); out.paste(base,(0,0),cm.point(lambda v:v)); return out
_SM={}
def _screen_mask():
    if not _SM:
        cm=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(cm).rounded_rectangle((0,0,(W-1)*S,(H-1)*S),radius=80*S,fill=255)
        _SM['m']=cm.resize((W,H),Image.LANCZOS)
    return _SM['m']
_BORDER={}
_REG={}
def _rest_region():
    """휴식 구간 영역(S배 L 마스크). 꼭짓점 = 화면 중심(CX,CY). 윗변은 3시 방사선(y=CY), 5시 쪽 변은 5시 방사선(60°)
    그대로라서 칸 경계각과 정확히 일치한다. 꼭짓점 주변은 둥글리지 않음."""
    if _REG: return _REG['r']
    FAR=900; a60=math.radians(60)
    tip=((CX+TIP_D)*S,CY*S)
    pts=[tip,((CX+FAR*math.cos(a60))*S,(CY+FAR*math.sin(a60))*S),
         ((CX+FAR)*S,(CY+FAR*math.tan(math.radians(30)))*S),((CX+FAR)*S,CY*S)]
    sec=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(sec).polygon(pts,fill=255)
    scr=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(scr).rounded_rectangle((0,0,(W-1)*S,(H-1)*S),radius=80*S,fill=255)
    sharp=ImageChops.multiply(sec,scr)
    soft=sharp.filter(ImageFilter.GaussianBlur(3*S)).point(lambda v:255 if v>127 else 0)  # 화면 모서리 쪽 꼭짓점만 살짝 둥글게
    near=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(near).ellipse((tip[0]-70*S,tip[1]-70*S,tip[0]+70*S,tip[1]+70*S),fill=255)
    _REG['r']=Image.composite(sharp,soft,near); return _REG['r']
def rest_border():
    if _BORDER: return _BORDER['y']
    reg=_rest_region()
    P=40; pad=Image.new('L',(W*S+2*P,H*S+2*P),0); pad.paste(reg,(P,P))
    inner=pad.filter(ImageFilter.MinFilter(2*BW*S+1)).crop((P,P,P+W*S,P+H*S))
    ring=ImageChops.subtract(reg,inner)
    _BORDER['y']=neon(ring,2.4); return _BORDER['y']
def text_layer(mode,mm,ss,hint=False):
    """글자 레이어(검정 바탕, 글로우 포함). 화면에는 ImageChops.add 로 더한다(앱 오버레이와 같은 방식)."""
    brk=mode=='break'
    T=Image.new('RGB',(W,H)); d=ImageDraw.Draw(T)
    for i,ch in enumerate(f"{mm:02d}"): sevenseg(d,ch,X0+i*40,Y0,32,60,MAIN_T,TC,DM)
    d.ellipse((X0+83.5,Y0+16.5,X0+88.5,Y0+21.5),fill=TC); d.ellipse((X0+83.5,Y0+38.5,X0+88.5,Y0+43.5),fill=TC)
    for i,ch in enumerate(f"{ss:02d}"): sevenseg(d,ch,X0+98+i*29,Y0+22,22,38,SEC_T,TC,DM)
    lab="REST" if brk else "FOCUS"; col=YEL if brk else FOCUS_C
    m=label_img(lab,col); T.paste(Image.new('RGB',m.size,col),(TX-1,Y0-14-LAB_H-1),m)
    if hint:
        c=(170,160,150); hy=BOXTOP-14
        d.line([(300,hy+5),(308,hy-3),(316,hy+5)],fill=c,width=2)
        d.text((324,hy-10),"5~60",font=ImageFont.truetype(FONT_HINT,17),fill=(140,134,126))
        d.line([(370,hy-3),(378,hy+5),(386,hy-3)],fill=c,width=2)
    # 글자 글로우: 가까운 흰빛 + 따뜻한 넓은 번짐
    G=ImageChops.add(T,T.filter(ImageFilter.GaussianBlur(2.5)).point(lambda v:int(v*0.55)))
    G=ImageChops.add(G,tint(T.filter(ImageFilter.GaussianBlur(7)),(0.55,0.45,0.32)))
    # 노란 밑줄은 테두리와 같은 네온 처리
    ul=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(ul).line([(p[0]*S,p[1]*S) for p in underline_pts()],fill=255,width=4*S,joint='curve')
    line,halo=_underline_cache(ul)
    return ImageChops.add(ImageChops.add(G,halo.point(lambda v:int(v*0.8))),line)
UL_BEND=17  # v11: 밑줄 왼쪽 끝을 중심 쪽으로 꺾은 길이(px)
def underline_pts():
    # 오른쪽 끝 → 꺾이는 점 → 화면 중심(CX,CY) 방향으로 UL_BEND 만큼
    yc=Y0-8; kx=TX+5; dx,dy=CX-kx,CY-yc; L=math.hypot(dx,dy)
    return [(TX+TW,yc),(kx,yc),(kx+dx/L*UL_BEND,yc+dy/L*UL_BEND)]
_UL={}
def _underline_cache(ul):
    if not _UL:
        P=40; pad=Image.new('L',(W*S+2*P,H*S+2*P),0); pad.paste(ul,(P,P))
        core=pad.filter(ImageFilter.MinFilter(2*S+1)).crop((P,P,P+W*S,P+H*S)).filter(ImageFilter.GaussianBlur(S*0.6))
        line=Image.new('RGB',(W*S,H*S)); line.paste(Image.new('RGB',(W*S,H*S),YEL),(0,0),ul)
        line.paste(Image.new('RGB',(W*S,H*S),YEL_CORE),(0,0),core)
        line=line.resize((W,H),Image.LANCZOS); mk=ul.resize((W,H),Image.LANCZOS)
        hc=Image.new('RGB',(W,H)); hc.paste(Image.new('RGB',(W,H),YEL_HALO),(0,0),mk)
        halo=ImageChops.add(hc.filter(ImageFilter.GaussianBlur(3)).point(lambda v:min(255,int(v*1.2))),tint(hc.filter(ImageFilter.GaussianBlur(9)),(0.9,0.55,0.2)))
        _UL['v']=(line,halo)
    return _UL['v']
def draw(mode,mm,ss,lit_off,hint=False):
    # v9와 같은 시그니처: lit_off = 꺼진 칸 수
    base=gauge_frame(N-lit_off)
    out=ImageChops.add(base,text_layer(mode,mm,ss,hint))
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).rounded_rectangle((0,0,W-1,H-1),radius=80,fill=255)
    res=Image.new('RGB',(W,H)); res.paste(out,(0,0),m); return res
def off_focus(rem,tot): return NF-math.ceil(rem/tot*NF)
def off_break(rem,tot): return NF+(NB-math.ceil(rem/tot*NB))
if __name__=="__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    draw('idle',25,0,0,True).save('01-idle-25.png',optimize=True)
    r=750; draw('focus',r//60,r%60,off_focus(r,1500)).save('02-focus-mid.png',optimize=True)
    r=70; draw('focus',r//60,r%60,off_focus(r,1500)).save('03-focus-almost.png',optimize=True)
    r=150; draw('break',r//60,r%60,off_break(r,300)).save('04-break.png',optimize=True)
    fr=[]; tot=1800; F=60
    for k in range(F+1):
        t=tot*k/F
        if t<1500: r=int(round(1500-t)); im=draw('focus',r//60,r%60,off_focus(r,1500))
        else: r=int(round(1800-t)); im=draw('break',r//60,r%60,off_break(max(r,1),300))
        fr.append(im.quantize(128,method=Image.Quantize.MAXCOVERAGE,dither=Image.Dither.NONE))
    fr[0].save('05-cycle-preview.gif',save_all=True,append_images=fr[1:],duration=117,loop=0,optimize=True)
