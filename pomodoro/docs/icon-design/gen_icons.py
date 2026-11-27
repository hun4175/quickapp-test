# 뽀모도로 퀵앱 런처 아이콘 시안 A–E 생성기. 실행: python3 gen_icons.py
# 결정적(난수 없음). 팔레트·네온 처리는 booster-design/v11/gen_v11.py 와 같은 값.
# 출력: A..E/icon-192.png(manifest 규격, /common/logo.png 와 같은 192x192 RGBA), A..E/icon-512.png(마스터), overview.png
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

# ---- v11 팔레트 ----
YEL=(255,214,36); YEL_CORE=(255,246,120); YEL_HALO=(190,118,12)
RED=(214,42,26); RED_IN=(96,12,8); RED_OFF=(34,7,6)
GRN=(115,224,116); GRN_IN=(30,110,48)
TC=(255,252,244); DM=(22,18,17)
BG=(0,0,0)
FONT='/usr/share/fonts/truetype/sand-box/google/Barlow Semi Condensed/BarlowSemiCondensed-ExtraBoldItalic.ttf'

M=512; S=4; HI=M*S; C=M/2   # 마스터 좌표계 0..512, 4배 슈퍼샘플
SAFE_R=212                  # 핵심 도형은 내접원 반지름 256 중 212 안(원형 크롭 여백)

def P(x,y): return (x*S,y*S)
def L(): return Image.new('L',(HI,HI),0)
def wedge_pts(cx,cy,r0,r1,a0,a1):
    n=max(4,int(abs(a1-a0)/0.7)); pts=[]
    for k in range(n+1):
        a=math.radians(a0+(a1-a0)*k/n); pts.append(P(cx+r1*math.cos(a),cy+r1*math.sin(a)))
    for k in range(n,-1,-1):
        a=math.radians(a0+(a1-a0)*k/n); pts.append(P(cx+r0*math.cos(a),cy+r0*math.sin(a)))
    return pts
def fill(canvas,mask,rgb):
    canvas.paste(Image.new('RGB',canvas.size,rgb),(0,0),mask)
def radial_fill(canvas,mask,cx,cy,r0,r1,cin,cout,knee=0.45):
    """중심 쪽 어둡게 → 바깥 평평한 셀 색 (v11 에어브러시 감쇠)."""
    g=Image.new('RGB',canvas.size,cout); d=ImageDraw.Draw(g); n=48
    for j in range(n,-1,-1):
        r=r0+(r1-r0)*j/n; t=min(1,(j/n)/knee)
        c=tuple(int(cin[i]+(cout[i]-cin[i])*t) for i in range(3))
        d.ellipse((*P(cx-r,cy-r),*P(cx+r,cy+r)),fill=c)
    canvas.paste(g,(0,0),mask)
def erode(m,px):
    k=2*int(px*S)+1
    return m.filter(ImageFilter.MinFilter(k)) if k>1 else m
def neon(mask,core_frac=0.38):
    """mask(HI L) → (선 RGB HI, 헤일로 RGB M). 노랑 몸통 + 흰빛 코어 + 호박색/주황 헤일로."""
    line=Image.new('RGB',(HI,HI)); fill(line,mask,YEL)
    # 코어 = 마스크를 침식(폭의 core_frac 남김)
    core=mask.filter(ImageFilter.GaussianBlur(3*S)).point(lambda v:255 if v>int(255*(1-core_frac)) else 0)
    core=core.filter(ImageFilter.GaussianBlur(S))
    fill(line,ImageChops.multiply(core,mask),YEL_CORE)
    mk=mask.resize((M,M),Image.LANCZOS); hc=Image.new('RGB',(M,M)); fill(hc,mk,YEL_HALO)
    halo=ImageChops.add(hc.filter(ImageFilter.GaussianBlur(7)).point(lambda v:min(255,int(v*1.4))),
                        tint(hc.filter(ImageFilter.GaussianBlur(22)),(0.9,0.5,0.15)))
    return line,halo
def tint(im,k):
    r,g,b=im.split(); return Image.merge('RGB',(r.point(lambda v:int(v*k[0])),g.point(lambda v:int(v*k[1])),b.point(lambda v:int(v*k[2]))))
def bloom(img,thr=70,r=14,k=0.5):
    src=img.point(lambda v:v if v>thr else 0)
    b=src.filter(ImageFilter.GaussianBlur(r)).point(lambda v:int(v*k))
    return ImageChops.lighter(img,b)
def finish(hi,halo=None,bloom_k=0.45):
    out=hi.resize((M,M),Image.LANCZOS)
    out=bloom(out,k=bloom_k)
    if halo is not None: out=ImageChops.screen(out,halo)
    return out
def compose_neon(base_hi,neon_masks):
    """base(HI RGB)에 네온 선을 얹고 M 크기로 반환."""
    halo=Image.new('RGB',(M,M))
    for m in neon_masks:
        ln,h=neon(m); fill(base_hi,m,(0,0,0)); base_hi=ImageChops.add(base_hi,ln); halo=ImageChops.add(halo,h)
    return base_hi,halo

# ---------------- A. SECTOR — v11 부채꼴 칸 게이지 축소판 ----------------
def concept_A():
    hi=Image.new('RGB',(HI,HI),BG)
    N=12; step=360/N; gap=4.0; r0,r1=58,206
    # 각도: 0°=3시, 시계방향(+). 휴식 = 3시~6시(0..90°) 3칸 중 마지막(0~30°)은 노랑. 집중 = 나머지 9칸, 그중 위쪽 2칸은 꺼짐(진행 중 느낌)
    for i in range(N):
        a0=i*step+gap/2; a1=(i+1)*step-gap/2
        m=L(); ImageDraw.Draw(m).polygon(wedge_pts(C,C,r0,r1,a0,a1),fill=255)
        m=m.filter(ImageFilter.GaussianBlur(2*S)).point(lambda v:255 if v>128 else 0)
        if i==0: radial_fill(hi,m,C,C,r0,r1,(90,62,6),YEL)
        elif i<3: radial_fill(hi,m,C,C,r0,r1,GRN_IN,GRN)
        elif i>=10: radial_fill(hi,m,C,C,r0,r1,(10,2,2),RED_OFF)
        else: radial_fill(hi,m,C,C,r0,r1,RED_IN,RED)
    # 휴식 구간 네온 테두리: 중심 꼭짓점 ~ 3시 / 6시 바깥
    reg=L(); d=ImageDraw.Draw(reg)
    d.pieslice((*P(C-r1-6,C-r1-6),*P(C+r1+6,C+r1+6)),0,90,fill=255)
    inner=erode(reg,11)
    ring=ImageChops.subtract(reg,inner)
    hi,halo=compose_neon(hi,[ring])
    # 허브
    d=ImageDraw.Draw(hi); hr=30; d.ellipse((*P(C-hr,C-hr),*P(C+hr,C+hr)),fill=(8,6,6))
    return finish(hi,halo)

# ---------------- B. TOMATO GAUGE — 토마토 몸통 = 원호 게이지 + 네온 바늘 ----------------
def concept_B():
    hi=Image.new('RGB',(HI,HI),BG); cy=290; R=176; ex=1.07   # 토마토 = 옆으로 살짝 넓은 원
    # 바깥 링 = 토마토 몸통. 칸 12개: 빨강 10(집중) + 초록 2(휴식), 칸 사이 검은 틈
    n=12; g=4.5; ro,ri=R,R-60
    for i in range(1,n-1):  # 맨 위 두 칸은 비우고 그 자리에 꼭지
        a0=-90+360*i/n+g/2; a1=-90+360*(i+1)/n-g/2
        m=L(); ImageDraw.Draw(m).polygon(wedge_pts(C,cy,ri,ro,a0,a1),fill=255)
        m=m.resize((int(HI*ex),HI),Image.LANCZOS); w=m.size[0]; m=m.crop(((w-HI)//2,0,(w-HI)//2+HI,HI))
        m=m.filter(ImageFilter.GaussianBlur(2*S)).point(lambda v:255 if v>128 else 0)
        if i in (3,4): radial_fill(hi,m,C,cy,ri,ro,GRN_IN,GRN,knee=0.6)
        else: radial_fill(hi,m,C,cy,ri,ro,RED_IN,RED,knee=0.6)
    # 꼭지(잎 5갈래 + 줄기) — 초록, 몸통과 검은 테두리로 분리
    lf=L(); d=ImageDraw.Draw(lf); top=cy-R; bx,by=C,top+8
    for ang,ln,wd in [(172,92,36),(8,92,36),(128,70,32),(52,70,32)]:
        a=math.radians(ang); tx,ty=bx+ln*math.cos(a),by+ln*math.sin(a)
        nx,ny=-math.sin(a)*wd/2,math.cos(a)*wd/2
        d.polygon([P(bx+nx,by+ny),P(tx,ty),P(bx-nx,by-ny)],fill=255)
    d.ellipse((*P(bx-24,by-20),*P(bx+24,by+20)),fill=255)
    d.polygon([P(C-9,by-4),P(C+9,by-4),P(C+20,by-56),P(C+4,by-58)],fill=255)
    lf=lf.filter(ImageFilter.GaussianBlur(1.5*S)).point(lambda v:255 if v>128 else 0)
    face=L(); ImageDraw.Draw(face).ellipse((*P(C-(ri-8)*ex,cy-ri+8),*P(C+(ri-8)*ex,cy+ri-8)),fill=255)
    radial_fill(hi,face,C,cy,0,ri,(8,2,2),(44,9,6),knee=1)
    sep=lf.filter(ImageFilter.MaxFilter(2*9*S+1)); fill(hi,sep,BG)
    fill(hi,lf,GRN)
    # 네온 바늘: 중심 → 약 2시 방향(휴식 칸 쪽으로 다가가는 중)
    nd=L(); d=ImageDraw.Draw(nd); a=math.radians(-35); ln=R-70
    tx,ty=C+ln*math.cos(a),cy+ln*math.sin(a); w=14
    px,py=-math.sin(a)*w,math.cos(a)*w
    d.polygon([P(C+px,cy+py),P(tx,ty),P(C-px,cy-py),P(C-math.cos(a)*24,cy-math.sin(a)*24)],fill=255)
    d.ellipse((*P(C-24,cy-24),*P(C+24,cy+24)),fill=255)
    hi,halo=compose_neon(hi,[nd])
    d=ImageDraw.Draw(hi); d.ellipse((*P(C-8,cy-8),*P(C+8,cy+8)),fill=(30,20,4))
    return finish(hi,halo)

# ---------------- C. SEGMENT — 이탤릭 7세그먼트 "25" + 네온 밑줄 + 칸 막대 ----------------
SEG={'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg'}
def sevenseg(d,ch,x,y,w,h,t,col,dim,sh=0.16):
    m=h/2; g=3.2
    def hz(yc):return [(x+t/2+g,yc),(x+t+g,yc-t/2),(x+w-t-g,yc-t/2),(x+w-t/2-g,yc),(x+w-t-g,yc+t/2),(x+t+g,yc+t/2)]
    def vt(xc,y0,y1):return [(xc,y0+t/2+g),(xc+t/2,y0+t+g),(xc+t/2,y1-t-g),(xc,y1-t/2-g),(xc-t/2,y1-t-g),(xc-t/2,y0+t+g)]
    Q={'a':hz(y+t/2),'g':hz(y+m),'d':hz(y+h-t/2),'f':vt(x+t/2,y,y+m),'b':vt(x+w-t/2,y,y+m),'e':vt(x+t/2,y+m,y+h),'c':vt(x+w-t/2,y+m,y+h)}
    for n,p in Q.items():
        q=[P(px+(y+h/2-py)*sh,py) for px,py in p]
        if n in SEG[ch]: d.polygon(q,fill=col)
        elif dim: d.polygon(q,fill=dim)
def concept_C():
    hi=Image.new('RGB',(HI,HI),BG); d=ImageDraw.Draw(hi)
    # 숫자
    dw,dh,t=118,190,30; x0=C-dw-14-6; y0=110
    T=Image.new('RGB',(HI,HI)); dt=ImageDraw.Draw(T)
    for i,ch in enumerate("25"): sevenseg(dt,ch,x0+i*(dw+28),y0,dw,dh,t,TC,DM)
    # 밑줄(왼쪽 끝 아래로 꺾임) — 네온
    ul=L(); du=ImageDraw.Draw(ul); yl=y0+dh+30
    du.line([P(C+132,yl),P(C-118,yl),P(C-140,yl+22)],fill=255,width=14*S,joint='curve')
    # 칸 막대: 빨강 5 + 초록 1 (집중 25 / 휴식 5 비율)
    bx0,bx1=C-110,C+138; by=yl+26; bh=36; n=6; gp=8; cw=(bx1-bx0-gp*(n-1))/n
    for i in range(n):
        x=bx0+i*(cw+gp); col=GRN if i==n-1 else RED
        sk=10
        d.polygon([P(x+sk,by),P(x+cw+sk,by),P(x+cw,by+bh),P(x,by+bh)],fill=col)
    hi=ImageChops.add(hi,T)
    hi,halo=compose_neon(hi,[ul])
    out=finish(hi,halo,bloom_k=0.35)
    # 숫자 웜 글로우(v11 text_layer 와 같은 방식)
    Tm=T.resize((M,M),Image.LANCZOS)
    out=ImageChops.add(out,tint(Tm.filter(ImageFilter.GaussianBlur(10)),(0.45,0.36,0.24)))
    return out

# ---------------- D. CHEVRON — 앞으로 꺾인 부스트 화살표 3겹 ----------------
def concept_D():
    hi=Image.new('RGB',(HI,HI),BG)
    def chev(x,col_mask):
        # 오른쪽을 향한 굵은 쉐브론, 위로 살짝 기울임(전진감)
        h=150; th=50; tip=78
        pts=[(x,C-h),(x+th,C-h),(x+th+tip,C),(x+th,C+h),(x,C+h),(x+tip,C)]
        m=L(); ImageDraw.Draw(m).polygon([P(px,py) for px,py in pts],fill=255)
        return m.filter(ImageFilter.GaussianBlur(1.5*S)).point(lambda v:255 if v>128 else 0)
    xs=[96,190,284]
    m1,m2,m3=chev(xs[0],0),chev(xs[1],0),chev(xs[2],0)
    radial_fill(hi,m1,C-200,C,0,260,(60,8,6),(120,22,14),knee=1)
    fill(hi,m2,RED)
    # 맨 앞 = 초록(휴식 = 결승점) + 노랑 네온 외곽선
    fill(hi,m3,GRN)
    outer=m3.filter(ImageFilter.MaxFilter(2*12*S+1)); ring=ImageChops.subtract(outer,m3.filter(ImageFilter.MaxFilter(2*3*S+1)))
    hi,halo=compose_neon(hi,[ring])
    return finish(hi,halo)

# ---------------- E. PIT WATCH — 스톱워치 + 빨강/초록 파이 + 네온 베젤 (이름 변형 포함) ----------------
def concept_E(name=None):
    hi=Image.new('RGB',(HI,HI),BG)
    cy=276 if name is None else 236; R=158 if name is None else 128
    k=R/158
    # 베젤 링(네온)
    ring=L(); d=ImageDraw.Draw(ring)
    d.ellipse((*P(C-R,cy-R),*P(C+R,cy+R)),fill=255); d.ellipse((*P(C-R+15*k,cy-R+15*k),*P(C+R-15*k,cy+R-15*k)),fill=0)
    # 크라운 버튼(위) + 기둥, 왼쪽 위 보조 버튼
    d.rounded_rectangle((*P(C-34*k,cy-R-44*k),*P(C+34*k,cy-R-20*k)),radius=6*S,fill=255)
    d.rectangle((*P(C-11*k,cy-R-24*k),*P(C+11*k,cy-R+4*k)),fill=255)
    a=math.radians(-135); bx,by=C+(R+10*k)*math.cos(a),cy+(R+10*k)*math.sin(a)
    btn=[(-14,-16),(14,-16),(14,10),(-14,10)]
    ca,sa=math.cos(math.radians(-45)),math.sin(math.radians(-45))
    d.polygon([P(bx+px*ca-py*sa,by+px*sa+py*ca) for px,py in [(x*k,y*k) for x,y in btn]],fill=255)
    # 파이: 집중 빨강 300°, 휴식 초록 60° (12시부터 시계방향)
    rr=R-34*k
    pr=L(); ImageDraw.Draw(pr).pieslice((*P(C-rr,cy-rr),*P(C+rr,cy+rr)),-90,210,fill=255)
    pg=L(); ImageDraw.Draw(pg).pieslice((*P(C-rr,cy-rr),*P(C+rr,cy+rr)),214,266,fill=255)
    radial_fill(hi,pr,C,cy,0,rr,RED_IN,RED,knee=0.7)
    radial_fill(hi,pg,C,cy,0,rr,GRN_IN,GRN,knee=0.7)
    # 바늘(흰색) 12시 → 경계선 위
    d=ImageDraw.Draw(hi); w=9*k
    d.line([P(C,cy),P(C,cy-rr+4)],fill=TC,width=int(w*S))
    d.ellipse((*P(C-18*k,cy-18*k),*P(C+18*k,cy+18*k)),fill=TC)
    d.ellipse((*P(C-7*k,cy-7*k),*P(C+7*k,cy+7*k)),fill=(20,14,12))
    hi,halo=compose_neon(hi,[ring])
    if name:
        f=ImageFont.truetype(FONT,108); bb=ImageDraw.Draw(Image.new('L',(1,1))).textbbox((0,0),name,font=f)
        tw=bb[2]-bb[0]; th=bb[3]-bb[1]; ty=cy+R+30
        tm=Image.new('L',(M,M),0); ImageDraw.Draw(tm).text((C-tw/2-bb[0],ty-bb[1]),name,font=f,fill=255)
        tm=tm.resize((HI,HI),Image.LANCZOS); fill(hi,tm,TC)
        # 밑줄 대신 글자 아래 빨강/초록 짧은 바
        d=ImageDraw.Draw(hi); y=ty+th+12
        d.polygon([P(C-tw/2+8,y),P(C+tw/2*0.55+8,y),P(C+tw/2*0.55,y+12),P(C-tw/2,y+12)],fill=RED)
        d.polygon([P(C+tw/2*0.55+18,y),P(C+tw/2+8,y),P(C+tw/2,y+12),P(C+tw/2*0.55+10,y+12)],fill=GRN)
    return finish(hi,halo)

CONCEPTS={'A':('SECTOR',concept_A),'B':('TOMATO GAUGE',concept_B),'C':('SEGMENT 25',concept_C),
          'D':('BOOST CHEVRON',concept_D),'E':('PIT WATCH',concept_E)}
VARIANTS={'E':[('name-BOOST',lambda:concept_E('BOOST'))]}

def to_icon(img,size):
    im=img.resize((size,size),Image.LANCZOS).convert('RGBA')
    return im
def circle(im,bg):
    s=im.size[0]; m=Image.new('L',(s*4,s*4),0); ImageDraw.Draw(m).ellipse((0,0,s*4-1,s*4-1),fill=255)
    m=m.resize((s,s),Image.LANCZOS); out=Image.new('RGB',(s,s),bg); out.paste(im.convert('RGB'),(0,0),m); return out

def overview(masters):
    F=ImageFont.truetype(FONT,34); Fs=ImageFont.truetype('/usr/share/fonts/truetype/sand-box/google/Barlow Semi Condensed/BarlowSemiCondensed-SemiBold.ttf',18)
    colw=300; n=len(masters); W=colw*n+150
    rows=[('512→256',256,False),('192 actual',192,False),('192 circle',192,True),('48',48,False),('48 circle',48,True),('32',32,False),('32 circle ×4',32,'zoom')]
    def panel(bg):
        hrow=[max(sz*(4 if z=='zoom' else 1),48)+26 for _,sz,z in rows]
        H=60+sum(hrow)+10; im=Image.new('RGB',(W,H),bg); d=ImageDraw.Draw(im)
        for ci,(k,(nm,img)) in enumerate(masters.items()):
            x=150+ci*colw; d.text((x+10,12),f"{k}  {nm}",font=F,fill=(255,214,36))
            y=60
            for (lab,sz,z),hh in zip(rows,hrow):
                ic=to_icon(img,sz)
                if z=='zoom': t=circle(ic,bg).resize((sz*4,sz*4),Image.NEAREST)
                elif z: t=circle(ic,bg)
                else: t=ic.convert('RGB')
                im.paste(t,(x+(colw-40-t.size[0])//2,y))
                if ci==0: d.text((10,y+4),lab,font=Fs,fill=(170,160,150))
                y+=hh
        return im
    a=panel((0,0,0)); b=panel((42,42,46))
    out=Image.new('RGB',(W,a.height+b.height+40),(0,0,0)); out.paste(a,(0,0)); out.paste(b,(0,a.height+40))
    d=ImageDraw.Draw(out); d.text((10,a.height+8),"launcher bg: dark grey #2A2A2E",font=Fs,fill=(170,160,150))
    return out

if __name__=='__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    masters={}
    for k,(nm,fn) in CONCEPTS.items():
        os.makedirs(k,exist_ok=True); img=fn(); masters[k]=(nm,img)
        to_icon(img,512).save(f'{k}/icon-512.png',optimize=True)
        to_icon(img,192).save(f'{k}/icon-192.png',optimize=True)
        for vn,vf in VARIANTS.get(k,[]):
            vi=vf(); to_icon(vi,512).save(f'{k}/icon-{vn}-512.png',optimize=True); to_icon(vi,192).save(f'{k}/icon-{vn}-192.png',optimize=True)
            masters[f'{k}2']=(vn,vi)
    overview(masters).save('overview.png',optimize=True)
    print('done')
