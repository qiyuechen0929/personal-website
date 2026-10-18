# -*- coding: utf-8 -*-
"""便签墙 + 抽屉：3D 物件与热点。"""
p = "index.html"
s = open(p, encoding="utf-8", newline="").read()
def rep(old, new, n=1):
    global s
    assert old in s, "MISS: " + old[:70]
    s = s.replace(old, new, n)

# ------------------------------------------------ 3D：便签 + 抽屉可抽出
rep("""  const drawer=box(.9,.5,1.1,M(0x8a5d3c,.72)); drawer.position.set(1.05,.63,0); deskG.add(drawer);""",
"""  const drawer=box(.9,.5,1.1,M(0x8a5d3c,.72)); drawer.position.set(1.05,.63,0); deskG.add(drawer);
  room.drawer=drawer; room.drawerZ=0;
  // 桌上那叠便利贴：最新的一张会显示在这里
  const nCv=makeCanvas(256,256), nCtx=nCv.getContext("2d");
  const nTex=new THREE.CanvasTexture(nCv); nTex.anisotropy=4;
  const notePad=new THREE.Mesh(new THREE.PlaneGeometry(.3,.3),
    new THREE.MeshStandardMaterial({map:nTex,roughness:.92,metalness:0}));
  notePad.rotation.x=-Math.PI/2; notePad.rotation.z=.16;
  notePad.position.set(-1.0,.995,-2.99);
  scene.add(notePad);
  room.noteCv=nCv; room.noteCtx=nCtx; room.noteTex=nTex; room.notePad=notePad;
  // 下面压着两张
  [[.007,-.05,0xe3d9a6],[.014,.09,0xd7dcb4]].forEach(([y,rot,cl])=>{
    const p=new THREE.Mesh(new THREE.PlaneGeometry(.3,.3), M(cl,.95));
    p.rotation.x=-Math.PI/2; p.rotation.z=rot;
    p.position.set(-1.0+y*.3,.993+y,-3.0+y);
    scene.add(p);
  });
  fnPaintNote("留给下一个人一句话。");""")

# ------------------------------------------------ notePaint
rep("""/* ---------------- 便签墙 ---------------- */""",
"""/* ---------------- 便签墙 ---------------- */
function fnPaintNote(text){
  const cv=room.noteCv, c=room.noteCtx; if(!cv||!c) return;
  const W=cv.width, H=cv.height;
  c.fillStyle="#ece2b4"; c.fillRect(0,0,W,H);
  const g=c.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"rgba(255,255,255,.35)"); g.addColorStop(1,"rgba(160,140,80,.16)");
  c.fillStyle=g; c.fillRect(0,0,W,H);
  c.fillStyle="rgba(90,78,44,.30)"; c.fillRect(0,H-16,W,16);
  c.fillStyle="#3b3423";
  c.font='600 22px "Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif';
  c.textBaseline="top";
  const words=String(text||"").split("");
  let line="", y=26;
  for(const ch of words){
    if(c.measureText(line+ch).width>W-34 || line.length>=8){
      c.fillText(line,W/2-c.measureText(line).width/2,y); line=ch; y+=30;
      if(y>H-52){ break; }
    } else line+=ch;
  }
  if(line && y<=H-46) c.fillText(line,W/2-c.measureText(line).width/2,y);
  if(room.noteTex) room.noteTex.needsUpdate=true;
}""")

# ------------------------------------------------ 热点：便签 / 抽屉
rep("""  addHot("cat","猫 · 打个招呼",[cbody,chead],V3(.9,.5,-1.1),""",
"""  addHot("notes","便签墙 · 留一句话",[room.notePad],V3(-1.0,1.03,-2.99),
    h=>flyThen(h,()=>openPanel("notes",h.anchor)),
    {yaw:.5,pitch:.34,radius:2.5,tx:-.95,ty:1.15,tz:-2.9});
  addHot("drawer","抽屉 · 过程稿",[room.drawer],V3(1.45,.63,-2.78),
    h=>{ Audio8.flip();
      tween({dur:620,ease:easeOut,onU:e=>{ room.drawer.position.z=e*.44; }});
      flyThen(h,()=>openPanel("drawer",h.anchor)); },
    {yaw:-.34,pitch:.36,radius:2.6,tx:1.45,ty:.78,tz:-2.85});
  addHot("cat","猫 · 打个招呼",[cbody,chead],V3(.9,.5,-1.1),""")

# ------------------------------------------------ 关面板时抽屉收回
rep("""function closePanel(){
  if(!panelName) return;""",
"""function closePanel(){
  if(!panelName) return;
  if(panelName==="drawer" && room.drawer){
    tween({dur:520,ease:easeIO,onU:e=>{ room.drawer.position.z=lerp(room.drawer.position.z,0,e); }});
  }""")

# ------------------------------------------------ 进屋子时把最新便签画到桌上
rep("""function enterSpace(origin){""",
"""function loadTopNote(){
  if(!room.noteTex) return;
  fetch("/api/notes?limit=1").then(r=>r.json()).then(d=>{
    const n=(d.notes||[])[0];
    if(n && n.text && !/\\uFFFD/.test(n.text)) fnPaintNote(n.text);
  }).catch(()=>{});
}

function enterSpace(origin){""")

open(p,"w",encoding="utf-8",newline="").write(s)
print("part2 ok")
