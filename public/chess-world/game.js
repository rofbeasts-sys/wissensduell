'use strict';

// ============================================================
// CHESS ENGINE
// ============================================================

const CHESS_SYMS = {
  wK:'\u265A\uFE0E',wQ:'\u265B\uFE0E',wR:'\u265C\uFE0E',wB:'\u265D\uFE0E',wN:'\u265E\uFE0E',wP:'\u265F\uFE0E',
  bK:'\u265A\uFE0E',bQ:'\u265B\uFE0E',bR:'\u265C\uFE0E',bB:'\u265D\uFE0E',bN:'\u265E\uFE0E',bP:'\u265F\uFE0E'
};

const PREGAME_GROUP_SLOTS={turm:2,springer:2,laeufer:2,dame:1,koenig:1,bauer:8};

const PIECE_GROUPS = [
  {group:'bauer',   name:'Bauer',   chess:'\u2659', pids:['bauer_s']                                        },
  {group:'turm',    name:'Turm',    chess:'\u2656', pids:['turm_s']                                         },
  {group:'laeufer', name:'Läufer',  chess:'\u2657', pids:['laeufer_d']                                      },
  {group:'springer',name:'Springer',chess:'\u2658', pids:['springer_m']                                     },
  {group:'dame',    name:'Dame',    chess:'\u2655', pids:['dame_f','dame_w','dame_e','dame_l','dame_v','dame_p']},
  {group:'koenig',  name:'König',   chess:'\u2654', pids:['koenig_b']                                       }
];
const PIECE_VAL = {K:20000,Q:900,R:500,B:330,N:320,P:100};

function initBoard(){
  const b=Array.from({length:8},()=>Array(8).fill(null));
  const back=['R','N','B','Q','K','B','N','R'];
  back.forEach((t,c)=>{
    b[0][c]={t,col:'b',moved:false};
    b[7][c]={t,col:'w',moved:false};
  });
  for(let c=0;c<8;c++){
    b[1][c]={t:'P',col:'b',moved:false};
    b[6][c]={t:'P',col:'w',moved:false};
  }
  return b;
}

function cloneBoard(b){ return b.map(r=>r.map(p=>p?{...p}:null)); }
function inB(r,c){ return r>=0&&r<8&&c>=0&&c<8; }

function getPseudoMoves(board,row,col,lastMove,skipCastle){
  const piece=board[row][col]; if(!piece) return [];
  const {t,col:color}=piece;
  const enemy=color==='w'?'b':'w';
  const moves=[];
  function slide(dr,dc){
    let r=row+dr,c=col+dc;
    while(inB(r,c)){
      if(board[r][c]){if(board[r][c].col===enemy)moves.push({fr:row,fc:col,tr:r,tc:c});break;}
      moves.push({fr:row,fc:col,tr:r,tc:c});
      r+=dr;c+=dc;
    }
  }
  function jump(dr,dc){
    const r=row+dr,c=col+dc;
    if(inB(r,c)&&(!board[r][c]||board[r][c].col===enemy))moves.push({fr:row,fc:col,tr:r,tc:c});
  }
  switch(t){
    case 'P':{
      const dir=color==='w'?-1:1;
      const sRow=color==='w'?6:1;
      if(inB(row+dir,col)&&!board[row+dir][col]){
        moves.push({fr:row,fc:col,tr:row+dir,tc:col});
        if(row===sRow&&!board[row+2*dir][col])moves.push({fr:row,fc:col,tr:row+2*dir,tc:col,dbl:true});
      }
      // pawnStrike: white pawn can also capture straight forward
      if(chess.pawnStrike&&color==='w'&&inB(row+dir,col)&&board[row+dir][col]?.col===enemy)
        moves.push({fr:row,fc:col,tr:row+dir,tc:col});
      [-1,1].forEach(dc=>{
        if(inB(row+dir,col+dc)){
          if(board[row+dir][col+dc]?.col===enemy)moves.push({fr:row,fc:col,tr:row+dir,tc:col+dc});
          if(lastMove?.dbl&&lastMove.tr===row&&lastMove.tc===col+dc)
            moves.push({fr:row,fc:col,tr:row+dir,tc:col+dc,ep:true});
        }
      });
      break;
    }
    case 'N':[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>jump(dr,dc));break;
    case 'B':[[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc));break;
    case 'R':[[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc));break;
    case 'Q':[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc));break;
    case 'K':
      [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>jump(dr,dc));
      if(!piece.moved&&!skipCastle){
        const rr=color==='w'?7:0;
        if(board[rr][7]?.t==='R'&&!board[rr][7].moved&&!board[rr][5]&&!board[rr][6]){
          if(!isInCheck(board,color)&&!sqAttacked(board,rr,5,enemy)&&!sqAttacked(board,rr,6,enemy))
            moves.push({fr:row,fc:col,tr:rr,tc:6,castle:'k'});
        }
        if(board[rr][0]?.t==='R'&&!board[rr][0].moved&&!board[rr][1]&&!board[rr][2]&&!board[rr][3]){
          if(!isInCheck(board,color)&&!sqAttacked(board,rr,3,enemy)&&!sqAttacked(board,rr,2,enemy))
            moves.push({fr:row,fc:col,tr:rr,tc:2,castle:'q'});
        }
      }
      break;
  }
  return moves;
}

function applyMove(board,move){
  const nb=cloneBoard(board);
  const piece=nb[move.fr][move.fc];
  nb[move.tr][move.tc]={...piece,moved:true};
  nb[move.fr][move.fc]=null;
  if(move.ep){const dir=piece.col==='w'?1:-1;nb[move.tr+dir][move.tc]=null;}
  if(move.castle==='k'){nb[move.tr][5]={...nb[move.tr][7],moved:true};nb[move.tr][7]=null;}
  else if(move.castle==='q'){nb[move.tr][3]={...nb[move.tr][0],moved:true};nb[move.tr][0]=null;}
  if(piece.t==='P'&&(move.tr===0||move.tr===7)){
    // Auto-promote to Queen for AI; for human we flag as pending (handled in doMove)
    if(move.promTo)nb[move.tr][move.tc].t=move.promTo;
    else nb[move.tr][move.tc].t='Q';
  }
  return nb;
}

function findKing(board,color){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.t==='K'&&board[r][c]?.col===color)return[r,c];
  return null;
}

function sqAttacked(board,row,col,byColor){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(board[r][c]?.col===byColor&&getPseudoMoves(board,r,c,null,true).some(m=>m.tr===row&&m.tc===col))return true;
  return false;
}

function isInCheck(board,color){
  const king=findKing(board,color);if(!king)return false;
  return sqAttacked(board,king[0],king[1],color==='w'?'b':'w');
}

function getLegalMoves(board,row,col,lastMove){
  const piece=board[row][col];if(!piece)return[];
  return getPseudoMoves(board,row,col,lastMove).filter(m=>!isInCheck(applyMove(board,m),piece.col));
}

function getAllLegalMoves(board,color,lastMove){
  const moves=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(board[r][c]?.col===color)moves.push(...getLegalMoves(board,r,c,lastMove));
  return moves;
}

// Piece-square tables for positional evaluation
const PST = {
  P: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0]
  ],
  N: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  B: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  R: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 0,  0,  0,  5,  5,  0,  0,  0]
  ],
  Q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  K: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20]
  ]
};

function evalBoard(board){
  let score=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=board[r][c];if(!p)continue;
    const pv=PIECE_VAL[p.t]||0;
    const pr=p.col==='b'?PST[p.t]?.[r]?.[c]||0:PST[p.t]?.[7-r]?.[c]||0;
    const contrib=pv+pr;
    score+=(p.col==='b'?1:-1)*contrib;
  }
  return score;
}

// Order moves: captures first (MVV-LVA), then by PST gain
function orderMoves(moves,board){
  return moves.slice().sort((a,b)=>{
    const ca=board[a.tr][a.tc],cb=board[b.tr][b.tc];
    const va=ca?(PIECE_VAL[ca.t]||0):0;
    const vb=cb?(PIECE_VAL[cb.t]||0):0;
    return vb-va;
  });
}

function minimax(board,depth,alpha,beta,isMax,lastMove){
  const color=isMax?'b':'w';
  const moves=getAllLegalMoves(board,color,lastMove);
  if(moves.length===0){
    if(isInCheck(board,color))return isMax?-30000:30000;
    return 0; // stalemate
  }
  if(depth===0)return evalBoard(board);
  const ordered=orderMoves(moves,board);
  if(isMax){
    let best=-Infinity;
    for(const m of ordered){
      const nb=applyMove(board,m);
      const v=minimax(nb,depth-1,alpha,beta,false,m);
      if(v>best)best=v;
      if(v>alpha)alpha=v;
      if(beta<=alpha)break;
    }
    return best;
  } else {
    let best=Infinity;
    for(const m of ordered){
      const nb=applyMove(board,m);
      const v=minimax(nb,depth-1,alpha,beta,true,m);
      if(v<best)best=v;
      if(v<beta)beta=v;
      if(beta<=alpha)break;
    }
    return best;
  }
}

// Returns AI difficulty settings based on current rank
function getAIDifficulty(){
  const idx=G.rankIdx; // 0=Amateur3 ... 20=Legende
  // Tiefe: 1 bei Amateur, bis 4 bei Legende
  const depth=idx<=2?1:idx<=5?2:idx<=11?3:4;
  // Jitter: viel Zufall bei niedrigem Rang, kaum bei hohem
  // Amateur: ±120, Bronze: ±80, Silber: ±40, Gold: ±20, Platin+: ±8, Meister+: ±2
  const jitter=idx<=2?120:idx<=5?80:idx<=8?40:idx<=11?20:idx<=17?8:2;
  // Blunder-Chance: manchmal absichtlich schlechten Zug wählen
  // Amateur: 35%, Bronze: 20%, Silber: 10%, Gold: 4%, Platin+: 0%
  const blunderChance=idx<=2?0.35:idx<=5?0.20:idx<=8?0.10:idx<=11?0.04:0;
  return{depth,jitter,blunderChance};
}

function getAIMove(board,lastMove,frozenSquares){
  let moves=getAllLegalMoves(board,'b',lastMove);if(!moves.length)return null;
  if(frozenSquares&&frozenSquares.length){
    moves=moves.filter(m=>!frozenSquares.some(f=>f.r===m.tr&&f.c===m.tc));
    if(!moves.length)return null;
  }
  const{depth,jitter,blunderChance}=getAIDifficulty();

  // Blunder: pick a random legal move instead
  if(Math.random()<blunderChance){
    return moves[Math.floor(Math.random()*moves.length)];
  }

  const ordered=orderMoves(moves,board);
  let best=null,bestScore=-Infinity;
  for(const m of ordered){
    const nb=applyMove(board,m);
    const v=minimax(nb,depth,-Infinity,Infinity,false,m);
    const j=(Math.random()-0.5)*jitter*2;
    if(v+j>bestScore){bestScore=v+j;best=m;}
  }
  return best;
}

// ============================================================
// COLLECTION DATA
// ============================================================

// Rang-Namen pro Figuren-Typ (5 Ränge = 5 Seltenheitsstufen)
const PIECE_RANKS = {
  bauer:    ['Abenteurer',          'S\u00F6ldner',       'Ritter',            'Elite-Ritter',         'K\u00F6nigsgarde'         ],
  turm:     ['Steinw\u00E4chter',   'Felskrieger',        'Eisenkoloss',       'Runengolem',           'Titan der Festung'        ],
  laeufer:  ['Schattenl\u00E4ufer', 'Meuchelm\u00F6rder','Schattenklinge',    'Phantomassassine',     'Meister der Schatten'     ],
  springer: ['Lehrling',            'Paladin',            'Ordensritter',      'Heiligkrieger',        'Champion des Lichts'      ],
  dame:     ['Zauberin',            'Elementar-Magierin', 'Erzmagierin',       'Arkanmeisterin',       'G\u00F6ttliche Erzmagierin'],
  koenig:   ['Anf\u00FChrer',       'Kriegsherr',         'Gro\u00DFkommandant','Kaiser',              'Legend\u00E4rer K\u00F6nig']
};

// Fähigkeits-% skaliert mit Rang (Index 0-4)
const ABILITY_SCALE = [5, 10, 18, 28, 40];

const COLL_PIECES = {
  bauer_s:    {group:'bauer',    name:'Bauer',    variant:'Schwertkämpfer', chess:'\u2659', baseHP:60,  baseATK:22, abilityId:'pawn_strike',  abilityLabel:'Geisterpfad',    desc:'Bauer schlägt diesen Zug auch vorwärts.'                    },
  turm_s:     {group:'turm',    name:'Turm',     variant:'Schildträger',   chess:'\u2656', baseHP:200, baseATK:40, abilityId:'rook_shield',  abilityLabel:'Schutzwall',     desc:'Turm kann 2 Züge nicht geschlagen werden.'                  },
  laeufer_d:  {group:'laeufer', name:'Läufer',   variant:'Dolchträger',    chess:'\u2657', baseHP:90,  baseATK:45, abilityId:'bishop_stab',  abilityLabel:'Dolchstoß',      desc:'Entfernt sofort die wertvollste benachbarte Gegnerfigur.'    },
  springer_m: {group:'springer',name:'Springer', variant:'Magier', chess:'\u2658', baseHP:110, baseATK:50, abilityId:'knight_magic', abilityLabel:'Arkaner Sprung', desc:'R1:2 Zufalls | R2:3 Zufalls | R3:2 wählbar | R4:3 wählbar | R5:5 wählbar (Kurve)'},
  dame_f:     {group:'dame',    name:'Dame',     variant:'Feuer',          chess:'\u2655', baseHP:130, baseATK:75, abilityId:'queen_fire',   abilityLabel:'Feuerball',      desc:'Schlägt alle Gegner im Umkreis von 2 Feldern.'               },
  dame_w:     {group:'dame',    name:'Dame',     variant:'Wasser',         chess:'\u2655', baseHP:150, baseATK:55, abilityId:'queen_water',  abilityLabel:'Flutwelle',      desc:'Schiebt alle benachbarten Feinde 2 Felder zurück.'           },
  dame_e:     {group:'dame',    name:'Dame',     variant:'Erde',           chess:'\u2655', baseHP:170, baseATK:45, abilityId:'queen_earth',  abilityLabel:'Steinwall',      desc:'Alle eigenen Figuren sind 1 Zug unschlagbar.'                },
  dame_l:     {group:'dame',    name:'Dame',     variant:'Luft',           chess:'\u2655', baseHP:120, baseATK:65, abilityId:'queen_air',    abilityLabel:'Windstoß',       desc:'Dame darf sich sofort ein zweites Mal bewegen.'              },
  dame_v:     {group:'dame',    name:'Dame',     variant:'Vita',           chess:'\u2655', baseHP:145, baseATK:50, abilityId:'queen_vita',   abilityLabel:'Lebensquell',    desc:'Bringt die zuletzt geschlagene eigene Figur zurück.'         },
  dame_p:     {group:'dame',    name:'Dame',     variant:'Physisch',       chess:'\u2655', baseHP:145, baseATK:70, abilityId:'queen_phys',   abilityLabel:'Donnerschlag',   desc:'Entfernt sofort die wertvollste Gegnerfigur auf dem Brett.'  },
  koenig_b: {group:'koenig', name:'K00f6nig', variant:'Buff', chess:'\u2654', baseHP:160, baseATK:45, abilityId:'king_buff', abilityLabel:'K00f6nigstausch', desc:'Tausche den K00f6nig 1x mit einer Nachbarfigur 2014 danach noch normal ziehen.'},
};

// Rang-Multipliers (Rang 1-5 = normal/blau/epic/legendar/mystisch)
const RARITIES = {
  normal:   {label:'Rang 1', color:'#6aaa6a', bg:'#050f05', glow:'#6aaa6a33', hpMult:1.0,  atkMult:1.0  },
  blau:     {label:'Rang 2', color:'#4488ff', bg:'#00091a', glow:'#4488ff33', hpMult:1.6,  atkMult:1.5  },
  epic:     {label:'Rang 3', color:'#bb55ff', bg:'#0a0018', glow:'#bb55ff33', hpMult:2.6,  atkMult:2.3  },
  legendar: {label:'Rang 4', color:'#c6ff3d', bg:'#150d00', glow:'#c6ff3d44', hpMult:4.2,  atkMult:3.8  },
  mystisch: {label:'Rang 5', color:'#ff4488', bg:'#18000c', glow:'#ff448844', hpMult:7.0,  atkMult:6.5  }
};
const RARITY_ORDER=['normal','blau','epic','legendar','mystisch'];

function getPieceRankName(pieceGroup, rarityKey) {
  const idx = RARITY_ORDER.indexOf(rarityKey);
  return PIECE_RANKS[pieceGroup]?.[idx] || rarityKey;
}

function getPieceStats(cp, rarityKey, level) {
  const rd = RARITIES[rarityKey];
  const lv = 1 + (level-1)*0.15;
  return {
    hp:  Math.floor(cp.baseHP  * rd.hpMult  * lv),
    atk: Math.floor(cp.baseATK * rd.atkMult * lv),
    parry: ABILITY_SCALE[RARITY_ORDER.indexOf(rarityKey)]
  };
}

const RANKS=[
  {name:'Amateur',     tier:3,winsNeeded:3, color:'#888888'},
  {name:'Amateur',     tier:2,winsNeeded:3, color:'#888888'},
  {name:'Amateur',     tier:1,winsNeeded:3, color:'#888888'},
  {name:'Bronze',      tier:3,winsNeeded:4, color:'#cd7f32'},
  {name:'Bronze',      tier:2,winsNeeded:4, color:'#cd7f32'},
  {name:'Bronze',      tier:1,winsNeeded:4, color:'#cd7f32'},
  {name:'Silber',      tier:3,winsNeeded:5, color:'#c0c0c0'},
  {name:'Silber',      tier:2,winsNeeded:5, color:'#c0c0c0'},
  {name:'Silber',      tier:1,winsNeeded:5, color:'#c0c0c0'},
  {name:'Gold',        tier:3,winsNeeded:6, color:'#ffd45a'},
  {name:'Gold',        tier:2,winsNeeded:6, color:'#ffd45a'},
  {name:'Gold',        tier:1,winsNeeded:6, color:'#ffd45a'},
  {name:'Platin',      tier:3,winsNeeded:7, color:'#7be0ff'},
  {name:'Platin',      tier:2,winsNeeded:7, color:'#7be0ff'},
  {name:'Platin',      tier:1,winsNeeded:7, color:'#7be0ff'},
  {name:'Diamant',     tier:3,winsNeeded:8, color:'#7be0ff'},
  {name:'Diamant',     tier:2,winsNeeded:8, color:'#7be0ff'},
  {name:'Diamant',     tier:1,winsNeeded:8, color:'#7be0ff'},
  {name:'Meister',     tier:0,winsNeeded:10,color:'#ff9900'},
  {name:'Grandmeister',tier:0,winsNeeded:12,color:'#ff5d8f'},
  {name:'Legende',     tier:0,winsNeeded:null,color:'#ff88ff'}
];


const RANK_REWARDS={
  'Amateur':      {keys:5,   coins:1000},
  'Bronze':       {keys:10,  coins:2000,  boardSkin:'bronze', pieceSkin:'bronze'},
  'Silber':       {keys:20,  coins:5000,  boardSkin:'silver', pieceSkin:'silver'},
  'Gold':         {keys:35,  coins:10000, boardSkin:'gold',   pieceSkin:'gold'},
  'Platin':       {keys:55,  coins:20000, boardSkin:'platin', pieceSkin:'platin'},
  'Diamant':      {keys:80,  coins:40000, boardSkin:'diamant',pieceSkin:'diamant'},
  'Meister':      {keys:120, coins:80000, boardSkin:'meister',pieceSkin:'meister',extra:'Drachen'},
  'Grandmeister': {keys:180, coins:150000,boardSkin:'gm',     pieceSkin:'gm',     extra:'Dschungel'},
  'Legende':      {keys:300, coins:300000,boardSkin:'legende',pieceSkin:'legende',extra:'Schatten'},
};
// Figur-Gewichte: Bauer häufigst → Turm → Läufer=Springer → König → Dame (seltenst bei JEDEM Rang)
const PIECE_WEIGHTS={
  bauer_s:30,bauer_b:28,bauer_sh:28,bauer_a:22,bauer_be:22,bauer_h:25,
  turm_s:8,laeufer_d:6,springer_m:6,koenig_b:3,
  dame_f:1,dame_w:1,dame_e:1,dame_l:1,dame_v:1,dame_p:1
};
const CHEST_TYPES={
  normal:   {name:'Normale Kiste',   cost:20,  emoji:'\uD83D\uDCE6'},
  epic:     {name:'Epische Kiste',   cost:50,  emoji:'\uD83D\uDC9C'},
  legendary:{name:'Legendäre Kiste', cost:100, emoji:'\uD83D\uDC51'}
};
function buildPool(){
  const pool=[];
  Object.keys(PIECE_WEIGHTS).forEach(pid=>{for(let i=0;i<PIECE_WEIGHTS[pid];i++)pool.push(pid);});
  return pool;
}
function pickPid(pool){return pool[Math.floor(Math.random()*pool.length)];}
function guaranteedDrop(rankIdx,pool){
  const pid=pickPid(pool);addToInventory(pid,rankIdx);
  return{pid,rarityKey:RARITY_ORDER[rankIdx],rankIdx};
}
function randomDrop(rates,pool){
  const pid=pickPid(pool);
  let roll=Math.random(),cum=0,rarityKey='normal';
  for(const[r,chance] of rates){cum+=chance;if(roll<cum){rarityKey=r;break;}}
  const rankIdx=RARITY_ORDER.indexOf(rarityKey);
  addToInventory(pid,rankIdx);return{pid,rarityKey,rankIdx};
}

// ============================================================
// GAME STATE
// ============================================================

let G={keys:3,rankIdx:0,winStreak:0,lossStreak:0,inventory:null,totalFights:0,totalWins:0,selectedDame:'v',
  questStats:null, questDone:{}, coins:0, shopOwned:{dragon:false,jungle:false,ocean_p:false,space:false}
};


// ── Server-Schlüssel (Brain-Pulse-Konto) ──
let CW_SERVER={loggedIn:false,freeKeysLeft:0,packs:[],bpCoins:0};
function cwToken(){try{return localStorage.getItem('wq_account_token')||'';}catch(e){return '';}}
async function cwApi(action,body){
  const token=cwToken();
  if(!token)return{ok:false,error:'Bitte in Brain Pulse einloggen.',noLogin:true};
  try{
    const r=await fetch('/api/chess/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({token:token},body||{}))});
    const j=await r.json();
    if(j&&j.ok){CW_SERVER.loggedIn=true;if(j.keys!==undefined){G.keys=j.keys;CW_SERVER.freeKeysLeft=j.freeKeysLeft;CW_SERVER.packs=j.packs||CW_SERVER.packs;CW_SERVER.bpCoins=j.coins;}}
    return j;
  }catch(e){return{ok:false,error:'Keine Verbindung zum Server.'};}
}
// Inventar-Abgleich: Der Server prueft, dass die Figuren zu den geoeffneten
// Truhen passen (Anticheat) und speichert sie im Konto (Geraetewechsel).
let cwInvSynced='',cwInvTimer=null;
function cwScheduleInvSync(){
  if(!CW_SERVER.loggedIn||!G.inventory)return;
  const snap=JSON.stringify(G.inventory);
  if(snap===cwInvSynced)return;
  clearTimeout(cwInvTimer);cwInvTimer=setTimeout(cwSyncInv,800);
}
async function cwSyncInv(){
  if(!CW_SERVER.loggedIn||!G.inventory)return;
  const snap=JSON.stringify(G.inventory);
  const j=await cwApi('inv-save',{inventory:G.inventory});
  if(j.ok){cwInvSynced=snap;return;}
  if(j.inv){G.inventory=j.inv;cwInvSynced=JSON.stringify(j.inv);try{localStorage.setItem('cw_v4',JSON.stringify(G));}catch(e){}try{showToast('\u26A0\uFE0F Inventar vom Server wiederhergestellt','#ff9900');renderCollection();}catch(e){}}
}
async function cwLoadInv(){
  const j=await cwApi('inv-load');
  if(!j.ok)return;
  if(j.inv){G.inventory=j.inv;cwInvSynced=JSON.stringify(j.inv);try{localStorage.setItem('cw_v4',JSON.stringify(G));}catch(e){}try{renderCollection();}catch(e){}}
  else cwSyncInv();
}
async function cwRefreshKeys(){
  const j=await cwApi('state');
  if(!j.ok)G.keys=0;
  try{updateTopBar();}catch(e){}
  return j;
}

let chess={
  board:null,turn:'w',lastMove:null,selected:null,validMoves:[],
  status:'idle',moveLog:[],
  abilitiesLeft:{},         // abilityId -> true(avail)/false(used)
  abilitiesUsedCount:0,     // max 5 pro Spiel
  frozenSquares:[],         // [{r,c,turns}] - can't be captured
  frozenEnemy:false,        // KI kann diesen Zug nicht ziehen
  extraMove:false,          // player gets extra move
  pawnStrike:false,         // pawn can capture forward
  capturedByAI:[],capturedByPlayer:[],
  timerInterval:null,timerSec:60,hintMove:null,hintAIMove:null,
  promotionPending:null,    // {r,c} awaiting promotion choice
  knightAbilityPending:null, // {rankIdx, knights, selectedKnight, targets}
  abilityUsedThisGame:false,  // tracks if any ability was used
  kingSwapPending:false      // king swap mode active
};

const MOVE_TIME=60;

function startMoveTimer(){
  stopMoveTimer();
  chess.timerSec=MOVE_TIME;
  const lbl=q('#move-timer');
  if(lbl){lbl.style.display='block';lbl.style.color='#ffd45a';}
  chess.timerInterval=setInterval(()=>{
    chess.timerSec--;
    const col=chess.timerSec>20?'#ffd45a':chess.timerSec>10?'#ff9900':'#ff5d8f';
    if(lbl){lbl.textContent=chess.timerSec;lbl.style.color=col;}
    if(chess.timerSec<=0){stopMoveTimer();if(chess.status==='playing'&&chess.turn==='w'){setStatus('Zeit abgelaufen! KI zieht...','#ff5d8f');chess.turn='b';setTimeout(()=>aiTurn(),400);}}
  },1000);
}

function stopMoveTimer(){
  if(chess.timerInterval){clearInterval(chess.timerInterval);chess.timerInterval=null;}
  const lbl=q('#move-timer');
  if(lbl)lbl.style.display='none';
}

// ============================================================
// DRAW / GEDANKEN MODE
// ============================================================
let drawMode=false;
let drawColor='#ffd45a';
let drawSize=4;
let isDrawing=false;
let lastDrawX=0,lastDrawY=0;

function setDrawColor(col){
  drawColor=col;
  document.querySelectorAll('#draw-colors div').forEach(d=>{
    const bg=d.style.background;
    d.style.border=bg===col?'2px solid #fff':'2px solid transparent';
    d.style.boxShadow=bg===col?'0 0 6px '+col+'88':'none';
  });
}

function toggleDrawMode(){
  drawMode=!drawMode;
  const canvas=q('#draw-canvas');
  const toolbar=q('#draw-toolbar');
  const btn=q('#draw-btn');
  if(!canvas||!toolbar||!btn)return;
  if(drawMode){
    const board=q('#chess-board');
    const rect=board.getBoundingClientRect();
    const dpr=window.devicePixelRatio||1;
    canvas.width=rect.width*dpr;
    canvas.height=rect.height*dpr;
    canvas.style.width=rect.width+'px';
    canvas.style.height=rect.height+'px';
    const ctx=canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    canvas.style.display='block';
    toolbar.style.display='flex';
    btn.style.borderColor='#ffd45a';btn.style.color='#ffd45a';btn.style.background='#2a1a5a';
    btn.textContent='\u270F\uFE0F AN \u2014 Brett zeichnen';
    setupDrawEvents(canvas);
  } else {
    canvas.style.display='none';
    toolbar.style.display='none';
    btn.style.borderColor='#ffd45a';btn.style.color='#ffd45a';btn.style.background='#1a0f3a';
    btn.textContent='\u270F\uFE0F GEDANKEN';
    removeDrawEvents(canvas);
  }
}

function clearDrawCanvas(){
  const canvas=q('#draw-canvas');if(!canvas)return;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
}

function getDrawPos(canvas,e){
  const rect=canvas.getBoundingClientRect();
  const src=e.touches?e.touches[0]:e;
  return{x:src.clientX-rect.left,y:src.clientY-rect.top};
}

function onDrawStart(e){
  e.preventDefault();
  isDrawing=true;
  const canvas=q('#draw-canvas');
  const pos=getDrawPos(canvas,e);
  lastDrawX=pos.x;lastDrawY=pos.y;
  const ctx=canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(pos.x,pos.y,drawSize/2,0,Math.PI*2);
  ctx.fillStyle=drawColor;
  ctx.globalAlpha=0.85;
  ctx.fill();
}
function onDrawMove(e){
  if(!isDrawing)return;
  e.preventDefault();
  const canvas=q('#draw-canvas');
  const ctx=canvas.getContext('2d');
  const pos=getDrawPos(canvas,e);
  ctx.beginPath();
  ctx.moveTo(lastDrawX,lastDrawY);
  ctx.lineTo(pos.x,pos.y);
  ctx.strokeStyle=drawColor;
  ctx.lineWidth=drawSize;
  ctx.lineCap='round';ctx.lineJoin='round';
  ctx.globalAlpha=0.85;
  ctx.stroke();
  lastDrawX=pos.x;lastDrawY=pos.y;
}
function onDrawEnd(){isDrawing=false;}

function setupDrawEvents(c){
  c.addEventListener('mousedown',onDrawStart);
  c.addEventListener('mousemove',onDrawMove);
  c.addEventListener('mouseup',onDrawEnd);
  c.addEventListener('mouseleave',onDrawEnd);
  c.addEventListener('touchstart',onDrawStart,{passive:false});
  c.addEventListener('touchmove',onDrawMove,{passive:false});
  c.addEventListener('touchend',onDrawEnd);
}
function removeDrawEvents(c){
  c.removeEventListener('mousedown',onDrawStart);
  c.removeEventListener('mousemove',onDrawMove);
  c.removeEventListener('mouseup',onDrawEnd);
  c.removeEventListener('mouseleave',onDrawEnd);
  c.removeEventListener('touchstart',onDrawStart);
  c.removeEventListener('touchmove',onDrawMove);
  c.removeEventListener('touchend',onDrawEnd);
}

function save(){
  G.pregameSetup=pregameSetup;
  localStorage.setItem('cw_v4',JSON.stringify(G));
  cwScheduleInvSync();
}
function load(){
  try{
    const d=localStorage.getItem('cw_v4')||localStorage.getItem('cw_v3');
    if(d){G=JSON.parse(d);if(G.collection&&!G.inventory){G.inventory=defaultInventory();}delete G.collection;if(!G.selectedDame)G.selectedDame='v';
      if(G.pregameSetup)pregameSetup=G.pregameSetup;
    }
  }catch(e){}
  G.keys=0;
  initQuestStats();
  initActivePieceSkin();
}

const BOARD_NEEDS={bauer:8,turm:2,laeufer:2,springer:2,dame:1,koenig:1};

const SKINS={
  classic:{name:'Amateur',emoji:'\u265F',unlockRank:0,glow:'#888888',cellLight:'#eeeed2',cellDark:'#769656',border:'#5a41b0',bg:'#1a0f3a',panel:'#2a1a5a'},
  bronze: {name:'Bronze', emoji:'B',     unlockRank:3,glow:'#cd7f32',cellLight:'#d9a066',cellDark:'#8a5a2b',border:'#5a2e00',bg:'#10141f',panel:'#120800'},
  silver: {name:'Silber', emoji:'S',     unlockRank:6,glow:'#c0c0c0',cellLight:'#e1e4ea',cellDark:'#7d8594',border:'#404040',bg:'#10141f',panel:'#0c0c0c'},
  gold:   {name:'Gold',   emoji:'G',     unlockRank:9,glow:'#ffd45a',cellLight:'#f4da82',cellDark:'#b8892a',border:'#7a5a00',bg:'#2a1e00',panel:'#100c00'},
  platin: {name:'Platin', emoji:'P',     unlockRank:12,glow:'#3de0ff',cellLight:'#8fe3f2',cellDark:'#2a8da6',border:'#006080',bg:'#001828',panel:'#000c14'},
  diamant:{name:'Diamant',emoji:'D',     unlockRank:15,glow:'#3de0ff',cellLight:'#d5f5ff',cellDark:'#4aa9d6',border:'#1a4060',bg:'#081420',panel:'#040a10'},
  meister:{name:'Meister',emoji:'M',     unlockRank:18,glow:'#ff9900',cellLight:'#ffb25a',cellDark:'#a14a12',border:'#7a3000',bg:'#200e00',panel:'#100700'},
  gm:     {name:'Grandmeister',emoji:'GM',unlockRank:19,glow:'#ff5d8f',cellLight:'#ff8aa8',cellDark:'#8a1f3d',border:'#660000',bg:'#1e0404',panel:'#0e0202'},
  legende:{name:'Legende',emoji:'L',     unlockRank:20,glow:'#c58bff',cellLight:'#c58bff',cellDark:'#4a1a8a',border:'#440066',bg:'#0e0018',panel:'#06000c'},
};
function isBoardSkinUnlocked(id){const s=SKINS[id];return s&&G.rankIdx>=(s.unlockRank||0);}
function initActivePieceSkin(){activePieceSkin=G.activePieceSkin||'classic';}
function applySkin(id){
  const s=SKINS[id];if(!s||!isBoardSkinUnlocked(id))return;
  G.activeSkin=id;
  const r=document.documentElement.style;
  r.setProperty('--cell-light',s.cellLight);r.setProperty('--cell-dark',s.cellDark);
  r.setProperty('--border',s.border);r.setProperty('--bg',s.bg);r.setProperty('--panel',s.panel);
  save();if(typeof renderSkinScreen==='function')renderSkinScreen();
}

// ============================================================
// FIGUREN-SKINS
// ============================================================
const PIECE_SKINS = {
  classic: {name:'Standard',        unlockRank:0,  glow:'#888888',colors:{w:'#c6ff3d',b:'#ff5d8f'}},
  bronze:  {name:'Bronze-Set',      unlockRank:3,  glow:'#cd7f32',colors:{w:'#f0a050',b:'#7a3a00'},body:['#f6b36b','#8a4f1d']},
  silver:  {name:'Silber-Set',      unlockRank:6,  glow:'#c0c0c0',colors:{w:'#e8e8e8',b:'#505050'},body:['#ffffff','#8a93a3']},
  gold:    {name:'Gold-Set',        unlockRank:9,  glow:'#ffd45a',colors:{w:'#c6ff3d',b:'#c6ff3d'},body:['#fff0a0','#c08a12']},
  platin:  {name:'Platin-Set',      unlockRank:12, glow:'#3de0ff',colors:{w:'#3de0ff',b:'#006080'},body:['#c8f7ff','#17a3c4']},
  diamant: {name:'Diamant-Set',     unlockRank:15, glow:'#3de0ff',colors:{w:'#aaeeff',b:'#1a4a6a'},body:['#eefcff','#55c4ee']},
  meister: {name:'Meister-Set',     unlockRank:18, glow:'#ff9900',colors:{w:'#ffbb44',b:'#aa4400'},body:['#ffd08a','#c0560e']},
  gm:      {name:'Grandmeister-Set',unlockRank:19, glow:'#ff5d8f',colors:{w:'#ff8888',b:'#2a1020'},body:['#ffb3c6','#a3204a']},
  legende: {name:'Legenden-Set',    unlockRank:20, glow:'#c58bff',colors:{w:'#cc44ff',b:'#440077'},body:['#e3c4ff','#6a2bc2']},
  dragon:  {name:'Drachen-Set',     unlockRank:999,glow:'#ff6600',colors:{w:'#ff9944',b:'#882200'},body:['#ffc27a','#a8320c'],shopId:'dragon',
    set:{wK:'🐲',wQ:'🔥',wR:'🏯',wB:'🦎',wN:'🐉',wP:'🥚',bK:'🐲',bQ:'🌋',bR:'🏯',bB:'🦎',bN:'🐉',bP:'🥚'}},
  jungle:  {name:'Dschungel-Set',   unlockRank:999,glow:'#44aa44',colors:{w:'#88ff44',b:'#1a5500'},body:['#c8ff9a','#1f7a2a'],shopId:'jungle',
    set:{wK:'🦁',wQ:'🌿',wR:'🌴',wB:'🦜',wN:'🐆',wP:'🌱',bK:'🐊',bQ:'🌑',bR:'🌵',bB:'🦎',bN:'🐍',bP:'🍄'}},
  ocean:   {name:'Ozean-Set',       unlockRank:999,glow:'#0088ff',colors:{w:'#44ddff',b:'#003366'},body:['#c9f6ff','#0b6a9c'],shopId:'ocean_p',
    set:{wK:'🐳',wQ:'🌊',wR:'⚓',wB:'🐬',wN:'🦀',wP:'🐚',bK:'🦑',bQ:'🌑',bR:'🪸',bB:'🐙',bN:'🦈',bP:'🐠'}},
  space:   {name:'Weltraum-Set',    unlockRank:999,glow:'#8844ff',colors:{w:'#aaaaff',b:'#220044'},body:['#e4dcff','#3b2a8a'],shopId:'space',
    set:{wK:'👨‍🚀',wQ:'⭐',wR:'🚀',wB:'🛸',wN:'🌙',wP:'🌟',bK:'👾',bQ:'🌑',bR:'🛰️',bB:'☄️',bN:'🪐',bP:'🔭'}},
};
function isPieceSkinUnlocked(id){
  const s=PIECE_SKINS[id];if(!s)return false;
  if(s.shopId)return !!(G.shopOwned&&G.shopOwned[s.shopId]);
  return G.rankIdx>=(s.unlockRank||0);
}

let activePieceSkin = 'classic';
function applyPieceSkin(id){
  const s=PIECE_SKINS[id];if(!s||!isPieceSkinUnlocked(id))return;
  activePieceSkin=id;
  G.activePieceSkin=id;
  save();if(typeof renderPieceSkinScreen==='function')renderPieceSkinScreen();
}

function shopTab(tab){
  const kisten=q('#shop-panel-kisten'), items=q('#shop-panel-items');
  const tbK=q('#shop-tab-kisten'), tbI=q('#shop-tab-items');
  if(!kisten||!items)return;
  if(tab==='kisten'){
    kisten.style.display='flex';items.style.display='none';
    if(tbK){tbK.style.borderColor='#ffd45a';tbK.style.background='#2a1a5a';tbK.style.color='#ffd45a';}
    if(tbI){tbI.style.borderColor='#5a41b0';tbI.style.background='#1a0f3a';tbI.style.color='#5a41b0';}
    renderChestScreen();
  } else {
    kisten.style.display='none';items.style.display='flex';items.style.flexDirection='column';items.style.gap='8px';
    if(tbK){tbK.style.borderColor='#5a41b0';tbK.style.background='#1a0f3a';tbK.style.color='#5a41b0';}
    if(tbI){tbI.style.borderColor='#ffd45a';tbI.style.background='#2a1a5a';tbI.style.color='#ffd45a';}
    renderShopScreen();
  }
}

function skinTab(tab){
  const brett=q('#skin-panel-brett'), figur=q('#skin-panel-figur');
  const tbB=q('#skin-tab-brett'), tbF=q('#skin-tab-figur');
  if(!brett||!figur)return;
  if(tab==='brett'){
    brett.style.display='block';figur.style.display='none';
    if(tbB){tbB.style.borderColor='#ffd45a';tbB.style.background='#2a1a5a';tbB.style.color='#ffd45a';}
    if(tbF){tbF.style.borderColor='#5a41b0';tbF.style.background='#1a0f3a';tbF.style.color='#5a41b0';}
    renderSkinScreen();
  } else {
    brett.style.display='none';figur.style.display='block';
    if(tbB){tbB.style.borderColor='#5a41b0';tbB.style.background='#1a0f3a';tbB.style.color='#5a41b0';}
    if(tbF){tbF.style.borderColor='#ffd45a';tbF.style.background='#2a1a5a';tbF.style.color='#ffd45a';}
    renderPieceSkinScreen();
  }
}
function renderSkinScreen(){
  const el=q('#skin-grid');if(!el)return;
  el.innerHTML='';
  el.style.cssText='display:flex;flex-direction:column;gap:6px';
  el.onclick=null;
  el.addEventListener('click',function(e){const c=e.target.closest('[data-skin]');if(c)applySkin(c.dataset.skin);});
  Object.entries(SKINS).forEach(([id,s])=>{
    const active=G.activeSkin===id, unlocked=isBoardSkinUnlocked(id), g=s.glow||'#ffd45a';
    const row=document.createElement('div');row.dataset.skin=id;
    row.style.cssText=
      'display:flex;align-items:center;gap:10px;padding:8px 10px'+
      ';border:2px solid '+(active?g:unlocked?g+'44':'#2a1a5a')+
      ';border-radius:10px;background:'+(active?'#130f00':'#1a0f3a')+
      ';box-shadow:'+(active?'0 0 14px '+g+'77':'none')+
      ';opacity:'+(unlocked?'1':'0.4')+';cursor:'+(unlocked?'pointer':'default');
    // Mini-Brett 4x4
    const mini=document.createElement('div');
    mini.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:1px;min-width:44px;height:44px;border-radius:4px;overflow:hidden;flex-shrink:0';
    for(let i=0;i<16;i++){const c=document.createElement('div');c.style.cssText='background:'+((Math.floor(i/4)+i%4)%2===0?s.cellLight:s.cellDark);mini.appendChild(c);}
    // Text
    const info=document.createElement('div');info.style.cssText='flex:1;min-width:0;overflow:hidden';
    const nm=document.createElement('div');nm.style.cssText='font-size:.72rem;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:'+(active?g:unlocked?g:'#5a41b0');
    nm.textContent=s.name;
    const sub=document.createElement('div');sub.style.cssText='font-size:.5rem;margin-top:2px;color:'+(active?'#ffd45a':'#5a41b0');
    sub.textContent=active?'✓ Aktiv':unlocked?'Antippen zum Aktivieren':'🔒 Rang erforderlich';
    info.appendChild(nm);info.appendChild(sub);
    // Badge
    if(active){const b=document.createElement('div');b.style.cssText='color:'+g+';font-size:1rem;flex-shrink:0';b.textContent='✓';row.appendChild(mini);row.appendChild(info);row.appendChild(b);}
    else{row.appendChild(mini);row.appendChild(info);}
    el.appendChild(row);
  });
}
function renderPieceSkinScreen(){
  const el=q('#piece-skin-grid');if(!el)return;
  el.innerHTML='';
  el.style.cssText='display:flex;flex-direction:column;gap:6px';
  el.onclick=null;
  el.addEventListener('click',function(e){const c=e.target.closest('[data-pskin]');if(c)applyPieceSkin(c.dataset.pskin);});
  let didDiv=false;
  Object.entries(PIECE_SKINS).forEach(([id,s])=>{
    const unlocked=isPieceSkinUnlocked(id), active=activePieceSkin===id, isEmoji=!!s.set;
    const g=s.glow||'#ffd45a';
    if(isEmoji&&!didDiv){
      didDiv=true;
      const sep=document.createElement('div');
      sep.style.cssText='display:flex;align-items:center;gap:6px;margin:2px 0';
      sep.innerHTML='<div style="flex:1;height:1px;background:#2a1a5a"></div><span style="font-size:.5rem;color:#5a41b0;white-space:nowrap">&#128176; SHOP-SETS</span><div style="flex:1;height:1px;background:#2a1a5a"></div>';
      el.appendChild(sep);
    }
    const row=document.createElement('div');row.dataset.pskin=id;
    const bc=active?g:unlocked&&!isEmoji?g+'44':isEmoji&&unlocked?'#ffd45a44':'#2a1a5a';
    row.style.cssText=
      'display:flex;align-items:center;gap:10px;padding:8px 10px'+
      ';border:2px solid '+bc+
      ';border-radius:10px;background:'+(active?'#130f00':'#1a0f3a')+
      ';box-shadow:'+(active?'0 0 14px '+g+'77':'none')+
      ';opacity:'+(unlocked?'1':'0.4')+';cursor:'+(unlocked?'pointer':'default');
    // Figur-Vorschau (eigene SVG-Figuren in der Skin-Farbe)
    const prev=document.createElement('div');
    prev.style.cssText='min-width:96px;display:flex;justify-content:center;gap:0;flex-shrink:0';
    prev.innerHTML=['P','N','Q'].map(function(t){return '<span style="width:32px;height:32px;display:block">'+chessPieceSVG(t,'w','dark',{body:s.body||null,accent:s.body?'#e8ecf5':null})+'</span>';}).join('');
    // Text
    const info=document.createElement('div');info.style.cssText='flex:1;min-width:0;overflow:hidden';
    const nm=document.createElement('div');nm.style.cssText='font-size:.72rem;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:'+(active?g:unlocked?isEmoji?'#ffd45a':g:'#5a41b0');
    nm.textContent=s.name;
    const sub=document.createElement('div');sub.style.cssText='font-size:.5rem;margin-top:2px;color:#5a41b0';
    sub.textContent=active?'✓ Aktiv':isEmoji&&!unlocked?'→ Im Shop kaufen':!unlocked?'🔒 Rang erforderlich':'Antippen zum Aktivieren';
    info.appendChild(nm);info.appendChild(sub);
    if(active){const b=document.createElement('div');b.style.cssText='color:'+g+';font-size:1rem;flex-shrink:0';b.textContent='✓';row.appendChild(prev);row.appendChild(info);row.appendChild(b);}
    else{row.appendChild(prev);row.appendChild(info);}
    el.appendChild(row);
  });
}
const COMBINE_COST=10;
const DEVELOP_COIN_COSTS=[500,5000,50000,100000,100000];

function defaultInventory(){
  return{
    bauer:   {s:[8,0,0,0,0]},
    turm:    {s:[2,0,0,0,0]},
    laeufer: {d:[2,0,0,0,0]},
    springer:{m:[2,0,0,0,0]},
    dame:    {f:[0,0,0,0,0],w:[0,0,0,0,0],e:[0,0,0,0,0],l:[0,0,0,0,0],v:[1,0,0,0,0],p:[0,0,0,0,0]},
    koenig:  {b:[1,0,0,0,0]}
  };
}

function getTotalPieces(group){
  if(!G.inventory?.[group])return 0;
  const inv=G.inventory[group];
  let total=0;
  Object.values(inv).forEach(arr=>{if(Array.isArray(arr))arr.forEach(c=>total+=c);});
  return total;
}

function canRankUp(group,variant,rankIdx){
  if(rankIdx>=4)return false;
  const count=(G.inventory?.[group]?.[variant]?.[rankIdx])||0;
  if(count<COMBINE_COST)return false;
  const cc=DEVELOP_COIN_COSTS[rankIdx]||100000;
  if((G.coins||0)<cc)return false;

  // Prüfe ob nach Entwicklung noch genug Figuren für das Brett vorhanden sind
  // Nach Entwicklung: (count - COMBINE_COST) Karten dieses Rangs + alle anderen Ränge + 1 neue Karte
  const need=BOARD_NEEDS[group]||1;
  const afterThis=count-COMBINE_COST; // verbleibende Karten dieses Rangs
  // Alle anderen Rang-Karten dieser Variante zählen
  let otherRanks=0;
  for(let ri=0;ri<5;ri++){
    if(ri===rankIdx)continue;
    otherRanks+=(G.inventory?.[group]?.[variant]?.[ri])||0;
  }
  otherRanks+=1; // die 1 neue Karte die durch Entwicklung entsteht
  const totalAfter=afterThis+otherRanks;
  if(totalAfter<need)return false;

  return true;
}

function doRankUp(group,variant,rankIdx){
  if(!canRankUp(group,variant,rankIdx))return false;
  const cc=DEVELOP_COIN_COSTS[rankIdx]||100000;
  if(!G.coins)G.coins=0;
  if(G.coins<cc){alert('Nicht genug Münzen! Benötigt: '+cc.toLocaleString()+' Münzen');return false;}
  G.coins-=cc;
  G.inventory[group][variant][rankIdx]-=COMBINE_COST;
  G.inventory[group][variant][rankIdx+1]=(G.inventory[group][variant][rankIdx+1]||0)+1;
  save();return true;
}

function addToInventory(pid,rankIdx){
  const cp=COLL_PIECES[pid];if(!cp)return;
  const v=pidVariant(pid);
  if(!G.inventory)G.inventory=defaultInventory();
  if(!G.inventory[cp.group])G.inventory[cp.group]={s:[0,0,0,0,0],a:[0,0,0,0,0]};
  G.inventory[cp.group][v][rankIdx]=(G.inventory[cp.group][v][rankIdx]||0)+1;
}

function getEloRankName(){const r=RANKS[G.rankIdx];return r.tier>0?r.name+' '+r.tier:r.name;}

function initStarters(){
  if(G.inventory)return;
  G.inventory=defaultInventory();
  save();
}

async function openChest(type){
  const j=await cwApi('open',{type:type});
  if(!j.ok){return{error:j.error||'Fehler'};}
  j.results.forEach(r=>addToInventory(r.pid,r.rankIdx));
  if(!G.coins)G.coins=0;
  G.coins+=j.coinBonus;
  save();
  return{results:j.results,coinBonus:j.coinBonus};
}

function getPromotionKeys(newRankIdx){
  // Jede Liga-Gruppe gibt +5 Schlüssel mehr:
  // Amateur(0-2)=5, Bronze(3-5)=10, Silber(6-8)=15, Gold(9-11)=20,
  // Platin(12-14)=25, Diamant(15-17)=30, Meister(18)=35, Grandmeister(19)=40, Legende(20)=45
  const ligaIdx=Math.floor(newRankIdx/3);
  return 5+(ligaIdx*5);
}

function onWin(){
  G.winStreak++;G.lossStreak=0;G.totalWins++;G.totalFights++;
  const rank=RANKS[G.rankIdx];
  const keys=1+Math.floor(G.rankIdx/3);
  let promoted=false;
  let promotionKeys=0;
  if(rank.winsNeeded&&G.winStreak>=rank.winsNeeded&&G.rankIdx<RANKS.length-1){
    G.rankIdx++;G.winStreak=0;promoted=true;
    promotionKeys=getPromotionKeys(G.rankIdx);
    const _rr=RANK_REWARDS[RANKS[G.rankIdx].name];if(_rr){if(_rr.coins){if(!G.coins)G.coins=0;G.coins+=_rr.coins;}}
  }
  // Quest max streak tracking
  if(!G.questStats)initQuestStats();
  G.questStats.maxWinStreak=Math.max(G.questStats.maxWinStreak||0,G.winStreak);
  if(!G.coins)G.coins=0;G.coins+=100*(1+Math.floor(G.rankIdx/3));
  save();
  cwApi('earn',{rankIdx:G.rankIdx}).then(function(j){if(j.ok&&j.granted>0)showToast('+'+j.granted+' \uD83D\uDD11 Schlüssel','#4aff4a');else if(j.ok)showToast('Tageslimit für Gratis-Schlüssel erreicht','#888');try{updateTopBar();}catch(e){}});
  return{keys:0,promoted,promotionKeys:0};
}

function onLoss(){
  G.winStreak=0;G.lossStreak++;G.totalFights++;
  let demoted=false;
  if(G.lossStreak>=2&&G.rankIdx>0){
    G.rankIdx--;G.lossStreak=0;G.winStreak=0;demoted=true;
  }
  if(!G.coins)G.coins=0;G.coins+=50;
  save();return{demoted};
}

// ============================================================
// SOUND EFFECTS (Web Audio API — kein MP3 nötig)
// ============================================================
let _audioCtx=null;
function getAudioCtx(){
  if(!_audioCtx){try{_audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}
  return _audioCtx;
}
function playSound(type){
  const ctx=getAudioCtx();if(!ctx)return;
  if(ctx.state==='suspended')ctx.resume();
  const master=ctx.createGain();
  master.gain.setValueAtTime(0.15,ctx.currentTime);
  master.connect(ctx.destination);
  if(type==='move'){
    // Sanftes weiches "Klick"
    const osc=ctx.createOscillator();
    const g=ctx.createGain();
    osc.connect(g);g.connect(master);
    osc.type='sine';
    osc.frequency.setValueAtTime(520,ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(420,ctx.currentTime+0.08);
    g.gain.setValueAtTime(1,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.12);
    osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.12);
  }else if(type==='capture'){
    // Sanfter dumpfer "Thud"
    const osc=ctx.createOscillator();
    const g=ctx.createGain();
    osc.connect(g);g.connect(master);
    osc.type='sine';
    osc.frequency.setValueAtTime(200,ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80,ctx.currentTime+0.2);
    g.gain.setValueAtTime(1,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.25);
    osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.25);
    const osc2=ctx.createOscillator();
    const g2=ctx.createGain();
    osc2.connect(g2);g2.connect(master);
    osc2.type='sine';
    osc2.frequency.setValueAtTime(340,ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(160,ctx.currentTime+0.1);
    g2.gain.setValueAtTime(0.45,ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.12);
    osc2.start(ctx.currentTime);osc2.stop(ctx.currentTime+0.12);
  }
}

// ============================================================
// CHESS UI
// ============================================================

function startNewGame(){
  chess.rec=[];
  chess.board=initBoard();

  // Alle Figuren immer auf dem Brett — Rang kommt aus pregameSetup, Anzahl ist immer voll
  const ownedCount={};
  ['turm','springer','laeufer','dame','koenig','bauer'].forEach(group=>{
    ownedCount[group]=PREGAME_GROUP_SLOTS[group]||1;
  });

  // Grundlinie aufbauen
  const backLayout=[
    {pos:0,group:'turm',   t:'R'},
    {pos:7,group:'turm',   t:'R'},
    {pos:1,group:'springer',t:'N'},
    {pos:6,group:'springer',t:'N'},
    {pos:2,group:'laeufer', t:'B'},
    {pos:5,group:'laeufer', t:'B'},
    {pos:3,group:'dame',    t:'Q'},
    {pos:4,group:'koenig',  t:'K'},
  ];
  for(let c=0;c<8;c++) chess.board[7][c]=null;
  const used={turm:0,springer:0,laeufer:0,dame:0,koenig:0};
  backLayout.forEach(({pos,group,t})=>{
    if(used[group]===undefined)used[group]=0;
    if(used[group]<ownedCount[group]){
      const sel=(pregameSetup[group]||[])[used[group]]||{v:'s',ri:0};
      chess.board[7][pos]={t,col:'w',moved:false,variant:sel.v,rankIdx:sel.ri,uid:'w_'+group+'_'+used[group]};
      used[group]++;
    }
  });

  // Bauern: immer alle 8 auf dem Brett, Rang aus pregameSetup
  for(let c=0;c<8;c++) chess.board[6][c]=null;
  const pawnSlots=pregameSetup['bauer']||[];
  for(let i=0;i<8;i++){
    const sel=pawnSlots[i]||{v:'s',ri:0};
    chess.board[6][i]={t:'P',col:'w',moved:false,variant:sel.v,rankIdx:sel.ri,uid:'w_bauer_'+i};
  }

  chess.turn='w';chess.lastMove=null;chess.selected=null;chess.validMoves=[];
  chess.status='playing';chess.moveLog=[];
  chess.frozenSquares=[];chess.frozenEnemy=false;chess.extraMove=false;chess.pawnStrike=false;chess.promotionPending=null;chess.knightAbilityPending=null;chess._pawnsCapturedThisGame=0;chess.abilityUsedThisGame=false;chess.kingSwapPending=false;chess.abilitiesUsedCount=0;
  chess.usedAbilityUids=new Set();
  chess.aiAbilitiesUsed=0;chess.aiUsedQueenAbility=false;chess.aiUsedBishopAbility=false;
  chess.aiUsedPawnAbility=false;chess.aiUsedRookAbility=false;chess.aiUsedKnightAbility=false;chess.aiUsedKingAbility=false;
  chess.capturedByAI=[];chess.capturedByPlayer=[];
  // abilitiesLeft: welche Typen hat der Spieler überhaupt
  chess.abilitiesLeft={};
  Object.keys(COLL_PIECES).forEach(pid=>{chess.abilitiesLeft[COLL_PIECES[pid].abilityId]=false;});
  if(G.inventory){
    Object.keys(COLL_PIECES).forEach(pid=>{
      const cp=COLL_PIECES[pid];
      const v=pidVariant(pid);
      if(cp.group==='dame'&&v!==G.selectedDame)return;
      const counts=G.inventory?.[cp.group]?.[v]||[];
      if(counts.some(c=>c>0))chess.abilitiesLeft[cp.abilityId]=true;
    });
  }
  q('#game-result').style.display='none';
  // Reset draw mode
  if(drawMode)toggleDrawMode();
  clearDrawCanvas();
  setStatus('Dein Zug \u2014 W\u00E4hle eine Figur','#ffd45a');
  // Show AI difficulty in log
  const{depth,blunderChance}=getAIDifficulty();
  const diffLabel=G.rankIdx<=2?'Anf\u00e4nger':G.rankIdx<=5?'Leicht':G.rankIdx<=8?'Mittel':G.rankIdx<=11?'Stark':G.rankIdx<=17?'Experte':'Meister';
  const diffEmoji=G.rankIdx<=2?'\uD83D\uDFE2':G.rankIdx<=5?'\uD83D\uDFE1':G.rankIdx<=8?'\uD83D\uDFE0':G.rankIdx<=11?'\uD83D\uDD34':G.rankIdx<=17?'\uD83D\uDFE3':'\u2B1B';
  chess.moveLog.push({text:diffEmoji+' KI-St\u00e4rke: '+diffLabel+' (Tiefe '+depth+(blunderChance>0?', Fehlerrate '+(blunderChance*100).toFixed(0)+'%':'')+')',ai:false,special:true});
  renderBoard();
  renderMoveLog();
  renderAbilities();
  renderCaptured();
  startMoveTimer();
  const hb=q('#draw-btn');if(hb)hb.style.display='block';
}

function setStatus(text,color){
  const el=q('#chess-status');if(!el)return;
  el.textContent=text;el.style.color=color||'#ffd45a';
}

function renderBoard(){
  const el=q('#chess-board');if(!el)return;
  el.innerHTML='';
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const cell=document.createElement('div');
      cell.className='chess-cell '+(((r+c)%2===0)?'cell-light':'cell-dark');
      const isSel=chess.selected?.row===r&&chess.selected?.col===c;
      const isValid=chess.validMoves.some(m=>m.tr===r&&m.tc===c);
      const isLastMove=chess.lastMove&&((chess.lastMove.fr===r&&chess.lastMove.fc===c)||(chess.lastMove.tr===r&&chess.lastMove.tc===c));
      const isFrozen=chess.frozenSquares.some(f=>f.r===r&&f.c===c);
      // King in check highlight
      const piece0=chess.board[r][c];
      const isKingInCheck=piece0?.t==='K'&&piece0?.col==='w'&&isInCheck(chess.board,'w');
      const isEnemyKingInCheck=piece0?.t==='K'&&piece0?.col==='b'&&isInCheck(chess.board,'b');
      if(isSel)cell.classList.add('cell-selected');
      else if(isKingInCheck||isEnemyKingInCheck)cell.classList.add('cell-check');
      else if(isLastMove)cell.classList.add('cell-last');
      if(isFrozen)cell.classList.add('cell-frozen');
      // King swap pending highlights
      if(chess.kingSwapPending){
        const ksp=chess.kingSwapPending;
        if(r===ksp.kr&&c===ksp.kc)cell.style.background='rgba(255,220,0,0.55)';
        if(ksp.neighbors.some(n=>n.r===r&&n.c===c))cell.style.background='rgba(255,120,255,0.45)';
      }
      // Knight ability pending highlights
      if(chess.knightAbilityPending){
        const kap=chess.knightAbilityPending;
        if(!kap.selectedKnight){
          // Highlight selectable knights
          if(kap.knights.some(k=>k.r===r&&k.c===c))
            cell.style.background='rgba(198,255,61,0.45)';
        } else {
          // Highlight selected knight
          if(kap.selectedKnight.r===r&&kap.selectedKnight.c===c)
            cell.style.background='rgba(255,220,0,0.55)';
          // Highlight jump targets
          if(kap.targets&&kap.targets.some(t=>t.r===r&&t.c===c))
            cell.style.background='rgba(100,255,180,0.45)';
        }
      }
      // Valid move indicator
      if(isValid){
        const ind=document.createElement('div');
        const hasPiece=chess.board[r][c];
        ind.className=hasPiece?'move-capture':'move-dot';
        cell.appendChild(ind);
        // Danger indicator: which enemy piece can recapture here after move
        const moveObj=chess.validMoves.find(m=>m.tr===r&&m.tc===c);
        if(moveObj){
          const afterBoard=applyMove(chess.board,moveObj);
          let dangerPiece=null,minVal=99999;
          for(let dr=0;dr<8;dr++)for(let dc=0;dc<8;dc++){
            const p=afterBoard[dr][dc];
            if(p?.col==='b'&&getPseudoMoves(afterBoard,dr,dc,null,true).some(m=>m.tr===r&&m.tc===c)){
              const v=PIECE_VAL[p.t]||0;
              if(v<minVal){minVal=v;dangerPiece=p;}
            }
          }
          if(dangerPiece){
            const warn=document.createElement('div');
            warn.className='move-danger';
            warn.textContent=CHESS_SYMS['b'+dangerPiece.t];
            cell.appendChild(warn);
          }
        }
      }
      // Piece
      const piece=chess.board[r][c];
      if(piece){
        const sp=document.createElement('span');
        sp.className='chess-piece '+(piece.col==='w'?'pw':'pb');
        // Aktiven Skin nur für Spieler-Figuren (weiß)
        const skin=piece.col==='w'?PIECE_SKINS[activePieceSkin]:null;
        {
          // Eigene SVG-Figur: Körper = Skin-Farbe, Kontur/Leuchten = Rangfarbe, Sterne = Rang
          let accent=null,body=null,rk;
          if(piece.col==='w'){
            const ri=piece.rankIdx||0; rk=ri;
            if(skin&&skin.body) body=skin.body;
            if(ri>0) accent=RARITIES[RARITY_ORDER[ri]]?.color||null;
            else if(body) accent='#e8ecf5';
          }
          sp.innerHTML=chessPieceSVG(piece.t,piece.col,'dark',{accent:accent,body:body,rank:rk});
          sp.classList.add('svgp');
        }
        if(chess.lastMove&&((chess.lastMove.tr===r&&chess.lastMove.tc===c)))sp.classList.add('piece-moved');
        sp.onclick=()=>handleClick(r,c);
        cell.appendChild(sp);
      }
      // Coord labels (col a-h on bottom row, row 1-8 on left col)
      if(r===7){
        const lbl=document.createElement('div');
        lbl.className='coord-c';lbl.textContent='abcdefgh'[c];
        cell.appendChild(lbl);
      }
      if(c===0){
        const lbl=document.createElement('div');
        lbl.className='coord-r';lbl.textContent=8-r;
        cell.appendChild(lbl);
      }
      cell.onclick=()=>handleClick(r,c);
      el.appendChild(cell);
    }
  }
}


// ── Figur-Fähigkeits-Panel ─────────────────────────────────────
// Figur anklicken → Panel zeigt Rang, Aktiv, Passiv, Button
function showPieceAbilityPanel(r, c, piece){
  const el = q('#piece-ability-panel');
  if(!el) return;
  const group = PIECE_TYPE_TO_GROUP[piece.t];
  if(!group){el.style.display='none';return;}
  const pg = PIECE_GROUPS.find(p=>p.group===group);
  if(!pg){el.style.display='none';return;}
  const ri      = piece.rankIdx ?? 0;
  const variant = piece.variant || pidVariant(pg.pids[0]);
  const pid     = pg.pids.find(p=>pidVariant(p)===variant) || pg.pids[0];
  const cp      = COLL_PIECES[pid];
  if(!cp){el.style.display='none';return;}
  const rar      = RARITY_ORDER[ri] || RARITY_ORDER[0];
  const rd       = RARITIES[rar];
  const abilData = RANK_ABILITIES[pid]?.[ri];
  const rankName = getPieceRankName(group, rar);
  const coord    = 'abcdefgh'[c]+(8-r);
  const alreadyUsed = chess.usedAbilityUids.has(piece.uid);
  const limitReached = (chess.abilitiesUsedCount||0) >= 5;
  const avail = !alreadyUsed && !limitReached && chess.turn==='w' && chess.status==='playing';

  el.style.display = 'block';
  el.style.borderColor = rd.color;
  el.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
      +'<div style="display:flex;align-items:center;gap:7px">'
        +'<span style="font-size:1.5rem;color:'+rd.color+';filter:drop-shadow(0 0 8px '+rd.color+'88)">'+cp.chess+'</span>'
        +'<div>'
          +'<div style="font-size:.68rem;color:'+rd.color+';font-weight:bold;letter-spacing:1px">'+cp.variant+'</div>'
          +'<div style="font-size:.48rem;color:#5a4020">'+rankName+' · '+coord+'</div>'
        +'</div>'
      +'</div>'
      +'<button onclick="hidePieceAbilityPanel()" style="background:none;border:none;color:#5a41b0;font-size:.9rem;cursor:pointer;padding:2px 6px">✕</button>'
    +'</div>'
    +'<div style="background:#1a0f3a;border-radius:6px;padding:6px 8px;margin-bottom:5px">'
      +'<div style="font-size:.44rem;color:#ffd45a;letter-spacing:1px;margin-bottom:2px">⚡ AKTIV — '+cp.abilityLabel+'</div>'
      +'<div style="font-size:.57rem;color:#ffd45a;line-height:1.45">'+(abilData?.aktiv||cp.desc)+'</div>'
    +'</div>'
    +(abilData?.passiv
      ?'<div style="background:#080e04;border-radius:6px;padding:5px 8px;margin-bottom:7px">'
          +'<div style="font-size:.44rem;color:#aa8800;letter-spacing:1px;margin-bottom:2px">★ PASSIV</div>'
          +'<div style="font-size:.54rem;color:#ccaa00;line-height:1.4">'+abilData.passiv+'</div>'
        +'</div>'
      :'<div style="margin-bottom:7px"></div>')
    +'<button onclick="usePieceAbilityByUid(\''+piece.uid+'\',\''+cp.abilityId+'\','+ri+')" '
      +'style="width:100%;padding:9px;border-radius:8px;font-size:.63rem;font-weight:bold;letter-spacing:1px;'
      +(avail
        ?'cursor:pointer;background:linear-gradient(135deg,#2a1a5a,#2a1200);border:1px solid '+rd.color+';color:'+rd.color+';box-shadow:0 0 12px '+rd.color+'44;'
        :'cursor:default;background:#1a0f3a;border:1px solid #2a1a5a;color:#5a41b0;')
      +'" '+(avail?'':'disabled')+'>'
      +(avail
        ?'⚡ '+cp.abilityLabel.toUpperCase()+' EINSETZEN'
        :(alreadyUsed?'✓ Bereits eingesetzt':limitReached?'— Limit erreicht':'— Nicht verfügbar'))
    +'</button>';
}

function hidePieceAbilityPanel(){
  const el=q('#piece-ability-panel');
  if(el)el.style.display='none';
}

// Neue Funktion: uid + korrekter Rang wird übergeben
function usePieceAbilityByUid(uid, abilityId, rankIdx){
  hidePieceAbilityPanel();
  if(!uid) return;
  if(chess.usedAbilityUids.has(uid)){
    setStatus('⚡ Diese Figur hat ihre Fähigkeit bereits eingesetzt!','#ff5d8f');
    return;
  }
  if((chess.abilitiesUsedCount||0)>=5){
    setStatus('⚡ Limit erreicht! Max. 5 Fähigkeiten pro Partie.','#ff5d8f');
    return;
  }
  chess.usedAbilityUids.add(uid);
  chess._lastUsedUid = uid;
  useAbility(abilityId, '', rankIdx);
}

function usePieceAbility(id,desc){
  hidePieceAbilityPanel();
  useAbility(id,desc);
}

function handleClick(r,c){
  // King swap pending: intercept all clicks
  if(chess.kingSwapPending){
    const ksp=chess.kingSwapPending;
    const isNeighbor=ksp.neighbors.some(n=>n.r===r&&n.c===c);
    if(isNeighbor){
      const king=chess.board[ksp.kr][ksp.kc];
      const piece=chess.board[r][c];
      chess.board[r][c]={...king,moved:true};
      chess.board[ksp.kr][ksp.kc]={...piece,moved:true};
      chess.abilitiesLeft['king_buff']=false; // legacy compat
      chess.kingSwapPending=false;
      chess.extraMove=true;
      chess.moveLog.push({text:'♔ Königstausch! König tauscht mit '+('abcdefgh'[c])+(8-r)+' — jetzt noch normal ziehen!',ai:false,special:true});
      renderBoard();renderMoveLog();renderAbilities();
    } else {
      // Cancel swap — Fähigkeit zurückgeben
      chess.kingSwapPending=false;
      chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);
      chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);
      renderBoard();renderAbilities();
    }
    return;
  }
  // Knight ability pending: intercept all clicks
  if(chess.knightAbilityPending){handleKnightAbilityClick(r,c);return;}
  if(chess.status!=='playing'||chess.turn!=='w')return;
  const piece=chess.board[r][c];
  // Click valid destination
  if(chess.selected&&chess.validMoves.some(m=>m.tr===r&&m.tc===c)){
    const move=chess.validMoves.find(m=>m.tr===r&&m.tc===c);
    hidePieceAbilityPanel();
    doMove(move,false);
    return;
  }
  // Select own piece
  if(piece&&piece.col==='w'){
    chess.selected={row:r,col:c};
    chess.validMoves=getLegalMoves(chess.board,r,c,chess.lastMove);
    renderBoard();
    showPieceAbilityPanel(r,c,piece);
  } else {
    chess.selected=null;chess.validMoves=[];
    hidePieceAbilityPanel();
    renderBoard();
  }
}

// Maps chess piece type to collection group
const PIECE_TYPE_TO_GROUP={P:'bauer',R:'turm',B:'laeufer',N:'springer',Q:'dame',K:'koenig'};

// Disable abilities whose figure is no longer on the board
function updateAbilitiesAfterCapture(){
  Object.keys(COLL_PIECES).forEach(pid=>{
    const cp=COLL_PIECES[pid];
    const v=pidVariant(pid);
    if(cp.group==='dame'&&v!==G.selectedDame)return;
    if(!chess.abilitiesLeft[cp.abilityId])return;
    const entry=Object.entries(PIECE_TYPE_TO_GROUP).find(([,g])=>g===cp.group);
    if(!entry)return;
    const pieceType=entry[0];
    let stillOnBoard=false;
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      if(chess.board[r][c]?.t===pieceType&&chess.board[r][c]?.col==='w'){stillOnBoard=true;break;}
    }
    if(!stillOnBoard)chess.abilitiesLeft[cp.abilityId]=false;
  });
}

function doMove(move,isAI){
  const piece=chess.board[move.fr][move.fc];
  if(!isAI){(chess.rec=chess.rec||[]).push({board:chess.board,last:chess.lastMove,col:'w',move:Object.assign({},move)});}
  const captured=chess.board[move.tr][move.tc];
  if(captured){
    if(!isAI)playSound('capture');
    else playSound('capture');
    if(isAI)chess.capturedByAI.push(captured);
    else{
      chess.capturedByPlayer.push(captured);
      // Quest: capture tracking
      trackQuestStat('captures',1);
      G.questStats.cap25=G.questStats.captures;
      G.questStats.cap50=G.questStats.captures;
      if(captured.t==='R')trackQuestStat('capturedRooks',1);
      if(captured.t==='Q')trackQuestStat('capturedQueens',1);
      // Track pawns captured in this game (stored in chess object)
      if(captured.t==='P'){chess._pawnsCapturedThisGame=(chess._pawnsCapturedThisGame||0)+1;if(chess._pawnsCapturedThisGame>=3)trackQuestStat('cap3PawnGame',1);}
    }
  }
  // Log
  const fc='abcdefgh'[move.fc],fr=8-move.fr;
  const tc='abcdefgh'[move.tc],tr=8-move.tr;
  const sym=CHESS_SYMS[(isAI?'b':'w')+piece.t];
  let log=sym+' '+fc+fr+'\u2192'+tc+tr;
  if(captured)log+=' \u00D7'+CHESS_SYMS[(isAI?'w':'b')+captured.t];
  if(move.castle)log+=' (Rochade)';
  chess.moveLog.push({text:log,ai:isAI});
  // Quest: castle
  if(!isAI&&move.castle){trackQuestStat('castles',1);G.questStats.castle10=G.questStats.castles;}

  // Human pawn promotion: show selection UI
  if(!isAI&&piece.t==='P'&&move.tr===0){
    trackQuestStat('pawnReached',1); // Bauer auf andere Seite
    chess.board=applyMove(chess.board,move); // temporarily apply (as Q)
    chess.lastMove=move;
    chess.selected=null;chess.validMoves=[];
    chess.frozenSquares=chess.frozenSquares.map(f=>{
      if(f.r===move.fr&&f.c===move.fc)return{r:move.tr,c:move.tc,turns:f.turns-1};
      return{...f,turns:f.turns-1};
    }).filter(f=>f.turns>0);
    chess.pawnStrike=false;
    chess.promotionPending={r:move.tr,c:move.tc,move};
    stopMoveTimer();
    renderBoard();renderMoveLog();renderCaptured();
    showPromotionUI(move.tr,move.tc);
    return;
  }

  chess.board=applyMove(chess.board,move);
  chess.lastMove=move;
  chess.selected=null;chess.validMoves=[];
  if(!captured)playSound('move');

  // If AI just captured a player piece, disable its ability if no more of that type remain
  if(isAI&&captured)updateAbilitiesAfterCapture();

  // Update frozen squares: move with piece if it moved, then decrement
  const prevFrozen=chess.frozenSquares.length;
  chess.frozenSquares=chess.frozenSquares.map(f=>{
    if(f.r===move.fr&&f.c===move.fc)return{r:move.tr,c:move.tc,turns:f.turns-1};
    return{...f,turns:f.turns-1};
  }).filter(f=>f.turns>0);
  // Notify when rook shield expires
  if(prevFrozen>0&&chess.frozenSquares.length===0){
    chess.moveLog.push({text:'\uD83D\uDEE1 Schutzwall abgelaufen!',ai:false,special:true});
  }
  if(!isAI){chess.pawnStrike=false;}
  if(!isAI&&chess.extraMove){chess.extraMove=false;}

  const nextCol=isAI?'w':'b';
  const nextMoves=getAllLegalMoves(chess.board,nextCol,move);

  // Check/checkmate/stalemate
  const inCheck=isInCheck(chess.board,nextCol);
  if(nextMoves.length===0){
    renderBoard();renderMoveLog();renderCaptured();
    if(!isAI){
      // Player just moved → AI has no moves → Player wins (checkmate or stalemate trap)
      chess.status='checkmate';
      showResult(true,inCheck?'SCHACHMATT! Du gewinnst!':'PATT-SIEG! Du gewinnst!');
    } else {
      // AI just moved → Player has no moves
      chess.status=inCheck?'checkmate':'stalemate';
      if(chess.status==='checkmate'){
        showResult(false,'SCHACHMATT! KI gewinnt!');
      } else {
        showResult(null,'PATT! Unentschieden.');
      }
    }
    return;
  }

  if(inCheck){
    if(isAI)setStatus('SCHACH! Dein König steht im Schach!','#ff5d8f');
    else{setStatus('SCHACH! KI-König im Schach!','#ff8800');trackQuestStat('checks',1);G.questStats.check50=G.questStats.checks;}
  }

  chess.turn=nextCol;
  chess.hintMove=null;chess.hintAIMove=null;
  renderBoard();renderMoveLog();renderCaptured();

  if(!isAI){
    renderAbilities();
    stopMoveTimer();
    if(!chess.extraMove){
      setStatus('KI denkt\u2026','#888888');
      setTimeout(()=>aiTurn(),500);
    } else {
      chess.extraMove=false;
      setStatus('Extra-Zug! W\u00E4hle eine Figur','#ff9900');
    }
  } else {
    setStatus('Dein Zug \u2014 W\u00E4hle eine Figur','#ffd45a');
    renderAbilities();
    startMoveTimer();
    const hb=q('#draw-btn');if(hb)hb.style.display='block';
  }
}

function aiShouldResign(){
  // Zähle Figuren
  let whitePieces=0,blackPieces=0,whiteVal=0,blackVal=0;
  let blackKingMoves=0,blackKingR=-1,blackKingC=-1;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=chess.board[r][c];if(!p)continue;
    const v=PIECE_VAL[p.t]||0;
    if(p.col==='w'){whitePieces++;whiteVal+=v;}
    else{blackPieces++;blackVal+=v;if(p.t==='K'){blackKingR=r;blackKingC=c;}}
  }
  // KI gibt NUR auf wenn nur noch der König übrig ist
  if(blackPieces===1)return true; // nur König → aufgeben
  return false;
}

function aiTurn(){
  if(chess.status!=='playing')return;
  // KI prüft ob Lage hoffnungslos ist
  if(aiShouldResign()){
    chess.status='checkmate';
    chess.moveLog.push({text:'🏳️ KI gibt auf — die Lage ist hoffnungslos!',ai:true,special:true});
    showResult(true,'KI gibt auf! Du gewinnst! 🏳️');
    return;
  }
  if(chess.frozenEnemy){
    chess.frozenEnemy=false;
    chess.turn='w';
    chess.moveLog.push({text:'\u2744\uFE0F KI-Zug blockiert! (Festung)',ai:false,special:true});
    setStatus('Dein Zug \u2014 W\u00E4hle eine Figur','#ffd45a');
    renderBoard();renderMoveLog();renderAbilities();
    startMoveTimer();
    const hb=q('#draw-btn');if(hb)hb.style.display='block';
    return;
  }

  // ── KI-FÄHIGKEITEN ──────────────────────────────────────────
  const aiAbilUsed=aiTryUseAbility();
  if(aiAbilUsed)return;

  const move=getAIMove(chess.board,chess.lastMove,chess.frozenSquares);
  if(move) doMove(move,true);
}

// KI versucht eine Fähigkeit einzusetzen — gibt true zurück wenn genutzt
function aiTryUseAbility(){
  const idx=G.rankIdx;
  // 0=Amateur3,1=Amateur2,2=Amateur1, 3=Bronze3,4=Bronze2,5=Bronze1
  // 6=Silber3,7=Silber2,8=Silber1,   9=Gold3,10=Gold2,11=Gold1
  // 12=Platin3,13=Platin2,14=Platin1, 15=Diamant3,16=Diamant2,17=Diamant1
  // 18=Meister, 19=GM, 20=Legende (aber 19=Legende laut RANKS)

  // Welche Fähigkeiten hat die KI bei diesem Rang?
  // Amateur (0-2):     keine Fähigkeiten
  // Bronze3 (3):       2 zufällige Bauern (Rang1)
  // Bronze2-1 (4-5):   alle Bauern (Rang1)
  // Silber3-1 (6-8):   alle Bauern + Turm (Rang1)
  // Gold3-1 (9-11):    alle Bauern + Turm + Springer (Rang1→2)
  // Platin3-1 (12-14): alle Bauern + Turm + Springer + Läufer (Rang2)
  // Diamant3-1 (15-17):alle + Dame (Rang2→3)
  // Meister (18):      alle Figuren Rang3
  // GM/Legende (19):   alle Figuren Rang4→5

  if(idx<=2)return false; // Amateur: keine Fähigkeiten

  if(!chess.aiAbilitiesUsed)chess.aiAbilitiesUsed=0;

  // Max Fähigkeiten pro Spiel je nach Rang
  const maxAIAbils=idx<=5?1:idx<=8?2:idx<=11?3:idx<=14?4:idx<=17?5:idx<=18?6:8;
  if(chess.aiAbilitiesUsed>=maxAIAbils)return false;

  // Aktivierungswahrscheinlichkeit pro Zug (steigt mit Rang)
  const triggerChance=idx<=5?0.20:idx<=8?0.25:idx<=11?0.30:idx<=14?0.35:idx<=17?0.40:0.55;
  if(Math.random()>triggerChance)return false;

  // Situationscheck: nur nutzen wenn sinnvoll
  let ownCount=0,enemyCount=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    if(chess.board[r][c]?.col==='b')ownCount++;
    else if(chess.board[r][c]?.col==='w')enemyCount++;
  }
  const kingInDanger=isInCheck(chess.board,'b');
  const shouldAct=enemyCount>=ownCount||kingInDanger||idx>=15;
  if(!shouldAct)return false;

  // Rang der KI-Fähigkeit (höherer Rang = stärkere Fähigkeit)
  const abilRank=idx<=5?0:idx<=8?0:idx<=11?1:idx<=14?2:idx<=17?2:idx<=18?3:4;

  // Hilfsfunktion: Spieler-König-Check nach Fähigkeit
  function checkPlayerKingDead(label){
    let alive=false;
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(chess.board[r][c]?.t==='K'&&chess.board[r][c]?.col==='w')alive=true;
    if(!alive){renderBoard();renderMoveLog();chess.status='checkmate';showResult(false,label+' trifft deinen König! KI gewinnt!');return true;}
    return false;
  }

  // Hilfsfunktion: nach Fähigkeit normalen Zug machen
  function doNormalMoveAfter(){
    renderBoard();renderMoveLog();
    const mv=getAIMove(chess.board,chess.lastMove,chess.frozenSquares);
    if(mv)doMove(mv,true);
  }

  // ── BAUERN-FÄHIGKEIT ──────────────────────────────────────────
  // Bronze3: 2 zufällige Bauern um 1 Feld vorrücken (extra Zug)
  // Bronze2+: alle Bauern um 1 vorrücken
  if(idx>=3&&!chess.aiUsedPawnAbility){
    const pawns=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)
      if(chess.board[r][c]?.t==='P'&&chess.board[r][c]?.col==='b'&&r<7&&!chess.board[r+1][c])
        pawns.push({r,c});
    if(pawns.length>=1){
      const toMove=idx<=3?pawns.sort(()=>Math.random()-.5).slice(0,2):pawns;
      let moved=0;
      toMove.forEach(p=>{
        if(inB(p.r+1,p.c)&&!chess.board[p.r+1][p.c]){
          // Schlägt Spielerfigur vorwärts wenn abilRank>=1
          const diag=[[p.r+1,p.c-1],[p.r+1,p.c+1]];
          let struck=false;
          if(abilRank>=1){
            for(const [nr,nc] of diag){
              if(inB(nr,nc)&&chess.board[nr][nc]?.col==='w'){
                chess.capturedByAI.push(chess.board[nr][nc]);
                chess.board[nr][nc]=null;
                chess.board[p.r][p.c]=null;
                // promotion if r+1===7 gives queen
                chess.board[nr][nc]={t:'P',col:'b'};
                moved++;struck=true;break;
              }
            }
          }
          if(!struck){chess.board[p.r+1][p.c]=chess.board[p.r][p.c];chess.board[p.r][p.c]=null;moved++;}
        }
      });
      if(moved>0){
        chess.aiUsedPawnAbility=true;
        chess.aiAbilitiesUsed++;
        chess.moveLog.push({text:'⚔️ KI-Bauern rücken vor! '+moved+' Bauern vorrückten!',ai:true,special:true});
        if(checkPlayerKingDead('⚔️ KI-Bauer'))return true;
        doNormalMoveAfter();
        return true;
      }
    }
  }

  // ── TURM-FÄHIGKEIT (ab Silber) ────────────────────────────────
  // Turm: schlägt alle Figuren in seiner Reihe/Spalte (Schutzwall-Angriff)
  if(idx>=6&&!chess.aiUsedRookAbility){
    const rooks=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)
      if(chess.board[r][c]?.t==='R'&&chess.board[r][c]?.col==='b')rooks.push({r,c});
    for(const rk of rooks){
      const hits=[];
      // Reihe + Spalte bis zur ersten eigenen Figur
      for(const[dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]){
        let nr=rk.r+dr,nc=rk.c+dc;
        while(inB(nr,nc)){
          if(chess.board[nr][nc]?.col==='b')break;
          if(chess.board[nr][nc]?.col==='w'){hits.push({r:nr,c:nc});break;}
          nr+=dr;nc+=dc;
        }
      }
      const valuable=hits.filter(h=>PIECE_VAL[chess.board[h.r][h.c]?.t]>=(abilRank>=2?100:300));
      if(valuable.length>=1){
        valuable.slice(0,abilRank>=2?3:1).forEach(h=>{chess.capturedByAI.push(chess.board[h.r][h.c]);chess.board[h.r][h.c]=null;});
        chess.aiUsedRookAbility=true;chess.aiAbilitiesUsed++;
        chess.moveLog.push({text:'🏰 KI-Turm: Schutzwall-Angriff! '+valuable.slice(0,abilRank>=2?3:1).length+' Figuren vernichtet!',ai:true,special:true});
        if(checkPlayerKingDead('🏰 KI-Turm'))return true;
        doNormalMoveAfter();return true;
      }
    }
  }

  // ── SPRINGER-FÄHIGKEIT (ab Gold) ─────────────────────────────
  // Springer: teleportiert zu einem zufälligen Feld und schlägt dort
  if(idx>=9&&!chess.aiUsedKnightAbility){
    const knights=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)
      if(chess.board[r][c]?.t==='N'&&chess.board[r][c]?.col==='b')knights.push({r,c});
    if(knights.length){
      const kn=knights[0];
      // Finde feindliche Figuren in erweiterten Springer-Sprüngen
      const jumps=[];
      const steps=abilRank>=1?3:2;
      const dests=[[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
      for(const[dr,dc] of dests){
        const nr=kn.r+dr,nc=kn.c+dc;
        if(inB(nr,nc)&&chess.board[nr][nc]?.col==='w')jumps.push({r:nr,c:nc});
      }
      if(jumps.length){
        // Wähle wertvollstes Ziel
        jumps.sort((a,b)=>(PIECE_VAL[chess.board[b.r][b.c]?.t]||0)-(PIECE_VAL[chess.board[a.r][a.c]?.t]||0));
        const target=jumps[0];
        chess.capturedByAI.push(chess.board[target.r][target.c]);
        chess.board[target.r][target.c]=chess.board[kn.r][kn.c];
        chess.board[kn.r][kn.c]=null;
        chess.aiUsedKnightAbility=true;chess.aiAbilitiesUsed++;
        chess.moveLog.push({text:'✨ KI-Springer: Arkaner Sprung! '+CHESS_SYMS['w'+(chess.capturedByAI.at(-1)?.t||'P')]+' ausgeschaltet!',ai:true,special:true});
        if(checkPlayerKingDead('✨ KI-Springer'))return true;
        doNormalMoveAfter();return true;
      }
    }
  }

  // ── LÄUFER-FÄHIGKEIT (ab Platin) ────────────────────────────
  // Läufer: entfernt wertvollste Figur in Sichtweite auf Diagonale
  if(idx>=12&&!chess.aiUsedBishopAbility){
    const bishops=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)
      if(chess.board[r][c]?.t==='B'&&chess.board[r][c]?.col==='b')bishops.push({r,c});
    for(const b of bishops){
      const hits=[];
      for(const[dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
        let nr=b.r+dr,nc=b.c+dc;
        while(inB(nr,nc)){
          if(chess.board[nr][nc]?.col==='b')break;
          if(chess.board[nr][nc]?.col==='w'){hits.push({r:nr,c:nc,v:PIECE_VAL[chess.board[nr][nc].t]||0});break;}
          nr+=dr;nc+=dc;
        }
      }
      const count=abilRank>=3?3:abilRank>=2?2:1;
      hits.sort((a,b2)=>b2.v-a.v);
      const targets=hits.slice(0,count);
      if(targets.length){
        targets.forEach(h=>{chess.capturedByAI.push(chess.board[h.r][h.c]);chess.board[h.r][h.c]=null;});
        chess.aiUsedBishopAbility=true;chess.aiAbilitiesUsed++;
        chess.moveLog.push({text:'🗡 KI-Läufer: Dolchstoß! '+targets.length+' Figur(en) ausgeschaltet!',ai:true,special:true});
        if(checkPlayerKingDead('🗡 KI-Läufer'))return true;
        doNormalMoveAfter();return true;
      }
    }
  }

  // ── DAME-FÄHIGKEIT (ab Diamant) ──────────────────────────────
  // Dame: Feuerball — alle Figuren in Radius 2
  if(idx>=15&&!chess.aiUsedQueenAbility){
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      if(chess.board[r][c]?.t==='Q'&&chess.board[r][c]?.col==='b'){
        const radius=abilRank>=4?3:2;
        const hits=[];
        for(let dr=-radius;dr<=radius;dr++)for(let dc=-radius;dc<=radius;dc++){
          if(!dr&&!dc)continue;
          const nr=r+dr,nc=c+dc;
          if(inB(nr,nc)&&chess.board[nr][nc]?.col==='w')hits.push({r:nr,c:nc});
        }
        const minHits=idx>=18?1:2;
        if(hits.length>=minHits){
          hits.forEach(h=>{chess.capturedByAI.push(chess.board[h.r][h.c]);chess.board[h.r][h.c]=null;});
          chess.aiUsedQueenAbility=true;chess.aiAbilitiesUsed++;
          chess.moveLog.push({text:'🔥 KI-Dame: Feuerball! '+hits.length+' Figuren vernichtet!',ai:true,special:true});
          if(checkPlayerKingDead('🔥 KI-Feuerball'))return true;
          doNormalMoveAfter();return true;
        }
      }
    }
  }

  // ── KÖNIG-FÄHIGKEIT (ab Meister) ────────────────────────────
  // König: Alle eigenen Figuren 1 Zug unschlagbar + extra Zug
  if(idx>=18&&!chess.aiUsedKingAbility){
    let ownFigs=0;
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(chess.board[r][c]?.col==='b')ownFigs++;
    if(ownFigs<=4||kingInDanger){ // nur wenn wenig Figuren oder König bedroht
      chess.frozenEnemy=false;
      // KI-Figuren sind 1 Zug unschlagbar (frozenSquares für 'b')
      chess.aiUsedKingAbility=true;chess.aiAbilitiesUsed++;
      chess.moveLog.push({text:'♔ KI-König: Königsbefehl! KI-Figuren sind unschlagbar diesen Zug!',ai:true,special:true});
      renderBoard();renderMoveLog();
      const mv=getAIMove(chess.board,chess.lastMove,chess.frozenSquares);
      if(mv)doMove(mv,true);
      return true;
    }
  }

  return false;
}

function renderGameHistory(){
  document.querySelectorAll('.game-history-list').forEach(renderGameHistoryInto);
}
function renderGameHistoryInto(el){
  const history=G.gameHistory||[];
  if(!history.length){
    el.innerHTML='<div style="font-size:.58rem;color:#444;text-align:center;padding:8px">Noch keine Spiele gespielt.</div>';
    return;
  }
  el.innerHTML='';
  history.forEach((g,i)=>{
    const isWin=g.result==='win';
    const isDraw=g.result==='draw';
    const color=isWin?'#4aff4a':isDraw?'#ffd45a':'#ff5d8f';
    const icon=isWin?'🏆':isDraw?'🤝':'💀';
    const label=isWin?'SIEG':isDraw?'UNENTSCHIEDEN':'NIEDERLAGE';

    // Typ-Badge
    const typeMap={
      matt:    {txt:'♟ Schachmatt', c:'#ffd45a', bg:'#2a1a5a'},
      patt:    {txt:'⚖️ Patt-Sieg',  c:'#4adfff', bg:'#001a22'},
      aufgabe: {txt:'🏳️ Aufgabe',   c:'#aaffaa', bg:'#001a00'},
      faehigkeit:{txt:'⚡ Fähigkeit',c:'#bb55ff', bg:'#1a0030'},
      ki_matt: {txt:'♟ KI-Matt',    c:'#ff6666', bg:'#2a1020'},
      unentschieden:{txt:'⚖️ Remis', c:'#ffd45a', bg:'#141000'},
    };
    // Legacy-Support für alte Einträge ohne winType
    let wt=g.winType;
    if(!wt){
      if(g.byMatt) wt=isWin?'matt':'ki_matt';
      else if(g.text&&g.text.includes('gibt auf')) wt='aufgabe';
      else if(g.text&&g.text.includes('Patt')) wt='patt';
      else if(isDraw) wt='unentschieden';
    }
    const badge=typeMap[wt];

    const row=document.createElement('div');
    row.style.cssText=
      'display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;margin-bottom:5px;'+
      'background:'+(isWin?'#06140a':isDraw?'#141000':'#140606')+';'+
      'border:1px solid '+(isWin?'#1a4a2a':isDraw?'#3a3000':'#4a1010')+';';
    row.innerHTML=
      '<div style="font-size:1rem;min-width:22px;text-align:center">'+icon+'</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'+
          '<span style="font-size:.68rem;font-weight:bold;color:'+color+'">'+label+'</span>'+
          '<span style="font-size:.52rem;color:#888">'+g.rank+'</span>'+
          (badge?'<span style="font-size:.48rem;color:'+badge.c+';background:'+badge.bg+';border-radius:4px;padding:1px 6px">'+badge.txt+'</span>':'')+
        '</div>'+
        '<div style="font-size:.52rem;color:#555;margin-top:2px">'+
          (g.moves?g.moves+' Züge':'')+
        '</div>'+
      '</div>'+
      '<div style="font-size:.48rem;color:#444;text-align:right;white-space:nowrap">'+g.time+'</div>';
    el.appendChild(row);
  });
}

function renderMoveLog(){
  const el=q('#move-log');if(!el)return;
  el.innerHTML='';
  chess.moveLog.slice(-30).forEach(e=>{
    const d=document.createElement('div');
    d.style.cssText='font-size:0.68rem;padding:2px 0;color:'+(e.special?'#ffd45a':e.ai?'#ff8888':'#7be0ff');
    d.textContent=e.text;
    el.appendChild(d);
  });
  el.scrollTop=el.scrollHeight;
}

function renderCaptured(){
  const pw=q('#cap-player'),pa=q('#cap-ai');
  if(pw)pw.textContent=chess.capturedByPlayer.map(p=>CHESS_SYMS['b'+p.t]).join('');
  if(pa)pa.textContent=chess.capturedByAI.map(p=>CHESS_SYMS['w'+p.t]).join('');
}

function renderAbilities(){
  const el=q('#ability-bar');if(!el)return;
  el.innerHTML='';
  el.style.cssText='display:flex;flex-direction:row;justify-content:center;align-items:center;padding:6px 8px;gap:0;background:var(--panel);border:1px solid var(--border);border-radius:8px;width:100%';

  const used=chess.abilitiesUsedCount||0;
  const remaining=5-used;

  const label=document.createElement('span');
  label.style.cssText='font-size:.55rem;color:#5a41b0;margin-right:6px;';
  label.textContent='⚡';
  el.appendChild(label);

  for(let i=0;i<5;i++){
    const dot=document.createElement('div');
    const active=i<remaining;
    dot.style.cssText='width:16px;height:16px;border-radius:50%;transition:all .3s;margin:0 3px;'
      +'background:'+(active?'radial-gradient(circle at 40% 35%,#ffd45a,#ffd45a)':'#2a1a5a')+';'
      +'border:1px solid '+(active?'#ffd45a88':'#2a1a0066')+';'
      +'box-shadow:'+(active?'0 0 8px #ffd45a66':'none')+';';
    el.appendChild(dot);
  }

  if(remaining<=0){
    const txt=document.createElement('span');
    txt.style.cssText='font-size:.48rem;color:#ff5d8f;margin-left:6px;font-weight:bold;letter-spacing:1px;';
    txt.textContent='LIMIT';
    el.appendChild(txt);
  }
}

    const row=document.createElement('div');
// ============================================================
// KNIGHT ABILITY HELPERS
// ============================================================

// Generate valid jump targets for a knight at (kr,kc) given rankIdx
// Rules:
//   Rang 1 (0): 2 random steps, any direction — fully random, shown after click
//   Rang 2 (1): 3 random steps
//   Rang 3 (2): player picks 2 steps, each must curve (no straight line)
//   Rang 4 (3): player picks 3 steps
//   Rang 5 (4): player picks 5 steps
// "Curve" = each step changes direction (no two consecutive steps same dr or dc)

function getKnightJumpCount(rankIdx){
  return[2,3,2,3,5][rankIdx]||2;
}
function isKnightRankRandom(rankIdx){
  return rankIdx<=1; // Rang 1+2 = random
}

// Returns all reachable cells after N steps from (r,c), each step must curve
// A step is any of 8 directions (including diagonal), must be free or capturable enemy
// "Curve" = consecutive steps cannot go same row OR same col direction (must turn)
function getKnightJumpTargets(board,startR,startC,steps){
  // BFS/DFS: state = (r, c, stepsLeft, lastDr, lastDc)
  // Each step: move 1 cell in any of 8 dirs, but not same dr AND not same dc as last step
  const results=new Set();
  function dfs(r,c,left,lastDr,lastDc){
    if(left===0){
      if(board[r][c]?.col!=='w') // can land on empty or enemy
        results.add(r*8+c);
      return;
    }
    for(const[dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){
      // Curve rule: must change BOTH row and col direction compared to last step
      // i.e. not (dr===lastDr) AND not (dc===lastDc) — need at least one change
      // We enforce: not going purely straight (must have a turn somewhere)
      if(lastDr!==null&&dr===lastDr&&dc===lastDc)continue; // no same dir
      if(lastDr!==null&&dr===lastDr&&dc===0&&lastDc===0)continue;
      if(lastDr!==null&&dc===lastDc&&dr===0&&lastDr===0)continue;
      // Enforce curve: if last step was a straight (dr=0 or dc=0), this step must not be same axis
      if(lastDr!==null){
        const lastStraight=lastDr===0||lastDc===0;
        const curStraight=dr===0||dc===0;
        // Both straight on same axis = not allowed
        if(lastDr===0&&dr===0&&Math.sign(lastDc)===Math.sign(dc))continue;
        if(lastDc===0&&dc===0&&Math.sign(lastDr)===Math.sign(dr))continue;
      }
      const nr=r+dr,nc=c+dc;
      if(!inB(nr,nc))continue;
      if(board[nr][nc]?.col==='w')continue; // can't pass through own pieces
      // Can pass through if not last step (can jump over for intermediate)
      if(left>1||!board[nr][nc]||board[nr][nc].col==='b'){
        dfs(nr,nc,left-1,dr,dc);
      }
    }
  }
  dfs(startR,startC,steps,null,null);
  results.delete(startR*8+startC);
  return [...results].map(k=>({r:Math.floor(k/8),c:k%8}));
}

function doKnightJump(fromR,fromC,toR,toC){
  const piece=chess.board[fromR][fromC];
  const captured=chess.board[toR][toC];
  if(captured)chess.capturedByPlayer.push(captured);
  chess.board[toR][toC]={...piece,moved:true};
  chess.board[fromR][fromC]=null;
  chess.abilitiesLeft['knight_magic']=false;
  chess.knightAbilityPending=null;
  chess.moveLog.push({text:'\u2728 Arkaner Sprung! \u2658 '+('abcdefgh'[fromC])+(8-fromR)+' \u2192 '+('abcdefgh'[toC])+(8-toR)+'!',ai:false,special:true});
  renderBoard();renderMoveLog();renderCaptured();renderAbilities();
}

function handleKnightAbilityClick(r,c){
  const kap=chess.knightAbilityPending;
  if(!kap)return false;

  // Phase 1: no knight selected yet — click must be on a knight
  if(!kap.selectedKnight){
    const isKnight=kap.knights.some(k=>k.r===r&&k.c===c);
    if(!isKnight)return true; // consumed click, did nothing
    kap.selectedKnight={r,c};
    if(isKnightRankRandom(kap.rankIdx)){
      // Random jump immediately
      const steps=getKnightJumpCount(kap.rankIdx);
      const targets=getKnightJumpTargets(chess.board,r,c,steps);
      if(!targets.length){
        chess.moveLog.push({text:'\u2728 Kein Ziel erreichbar!',ai:false,special:true});
        chess.knightAbilityPending=null;
        renderBoard();renderMoveLog();renderAbilities();
        return true;
      }
      const t=targets[Math.floor(Math.random()*targets.length)];
      doKnightJump(r,c,t.r,t.c);
    } else {
      // Show targets for player to pick
      const steps=getKnightJumpCount(kap.rankIdx);
      kap.targets=getKnightJumpTargets(chess.board,r,c,steps);
      if(!kap.targets.length){
        chess.moveLog.push({text:'\u2728 Kein Ziel erreichbar!',ai:false,special:true});
        chess.knightAbilityPending=null;
        renderBoard();renderMoveLog();renderAbilities();
        return true;
      }
      renderBoard();
    }
    return true;
  }

  // Phase 2: knight selected, player picks target
  const isTarget=kap.targets&&kap.targets.some(t=>t.r===r&&t.c===c);
  if(isTarget){
    doKnightJump(kap.selectedKnight.r,kap.selectedKnight.c,r,c);
    return true;
  }
  // Click elsewhere cancels
  chess.knightAbilityPending=null;
  renderBoard();renderAbilities();
  return true;
}

// Wird von renderAbilities aufgerufen — spezifische Figur mit uid
function useAbilityForPiece(piece, cp, r, c){
  if(!piece||!piece.uid)return;
  if(chess.usedAbilityUids.has(piece.uid)){
    setStatus('⚡ Diese Figur hat ihre Fähigkeit bereits eingesetzt!','#ff5d8f');
    return;
  }
  if((chess.abilitiesUsedCount||0)>=5){
    setStatus('⚡ Limit erreicht! Max. 5 Fähigkeiten pro Runde.','#ff5d8f');
    return;
  }
  // uid als genutzt markieren
  chess.usedAbilityUids.add(piece.uid);
  chess._lastUsedUid=piece.uid;
  // useAbility mit dem Rang dieser konkreten Figur aufrufen
  useAbility(cp.abilityId, cp.desc, piece.rankIdx);
}

function useAbility(id,desc,overrideRi){
  // Max 5 Fähigkeiten pro Spiel
  if((chess.abilitiesUsedCount||0)>=5){
    setStatus('⚡ Limit erreicht! Max. 5 Fähigkeiten pro Partie.','#ff5d8f');
    return;
  }
  chess.abilitiesUsedCount=(chess.abilitiesUsedCount||0)+1;
  chess.abilityUsedThisGame=true;

  // Rang: entweder direkt übergeben (von useAbilityForPiece) oder aus Brett ermitteln
  let ri=overrideRi!=null?overrideRi:0;
  if(overrideRi==null){
    const abPid=Object.keys(COLL_PIECES).find(pid=>COLL_PIECES[pid].abilityId===id);
    const abGroup=abPid?COLL_PIECES[abPid].group:null;
    if(abGroup){
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){
        const p=chess.board[r][c];
        if(p&&p.col==='w'&&p.rankIdx!=null){
          const g=PIECE_TYPE_TO_GROUP[p.t];
          if(g===abGroup&&p.rankIdx>ri)ri=p.rankIdx;
        }
      }
    }
  }
  // Quest tracking
  if(ri===0)trackQuestStat('abilityRank1',1);
  else if(ri===1)trackQuestStat('abilityRank2',1);
  else if(ri===2)trackQuestStat('abilityRank3',1);
  else if(ri===3)trackQuestStat('abilityRank4',1);
  else if(ri===4)trackQuestStat('abilityRank5',1);

  let logText='';

  switch(id){

    // ── BAUER ──────────────────────────────────────────────────────
    case 'pawn_strike':
      if(ri<=1){
        // R1: Bauer schlägt vorwärts (1 Zug)
        // R2: Bauer schlägt vorwärts + bekommt Extra-Zug
        chess.pawnStrike=true;
        if(ri>=1){chess.extraMove=true;logText='⚔️ Sturmschlag! Bauern schlagen vorwärts + Extra-Zug!';}
        else logText='⚔️ Geisterpfad! Nächster Bauernzug schlägt auch vorwärts!';
      } else if(ri===2){
        // R3: Alle Bauern schlagen diesen Zug vorwärts
        chess.pawnStrike=true;
        chess.extraMove=true;
        logText='⚔️ Sturmwelle! Alle Bauern schlagen vorwärts + Extra-Zug!';
      } else if(ri===3){
        // R4: Vorderster Bauer verwandelt sich sofort zur Dame
        let promoted=false;
        for(let c=0;c<8&&!promoted;c++)
          for(let r=0;r<8&&!promoted;r++){
            const p=chess.board[r][c];
            if(p?.t==='P'&&p.col==='w'){chess.board[r][c]={...p,t:'Q'};promoted=true;logText='♛ Beförderung! Bauer wird sofort zur Dame!';}
          }
        if(!promoted){chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);logText='⚔️ Kein Bauer auf dem Brett.';}
      } else {
        // R5: Alle Bauern verwandeln sich zur Dame
        let count=0;
        for(let r=0;r<8;r++)for(let c=0;c<8;c++){
          const p=chess.board[r][c];
          if(p?.t==='P'&&p.col==='w'){chess.board[r][c]={...p,t:'Q'};count++;}
        }
        logText=count>0?'♛ Massenbeförderung! '+count+' Bauern werden zur Dame!':'⚔️ Keine Bauern mehr übrig.';
      }
      break;

    // ── TURM ───────────────────────────────────────────────────────
    case 'rook_shield':
      if(ri===0){
        // R1: 1 Turm 2 Züge unschlagbar
        for(let r=0;r<8;r++)for(let c=0;c<8;c++){
          if(chess.board[r][c]?.t==='R'&&chess.board[r][c]?.col==='w'){
            chess.frozenSquares.push({r,c,turns:2});
            logText='🛡 Schutzwall! Turm auf '+('abcdefgh'[c])+(8-r)+' unschlagbar (2 Züge)';break;
          }
        }
      } else if(ri===1){
        // R2: Beide Türme 2 Züge unschlagbar
        let found=0;
        for(let r=0;r<8;r++)for(let c=0;c<8;c++){
          if(chess.board[r][c]?.t==='R'&&chess.board[r][c]?.col==='w'){chess.frozenSquares.push({r,c,turns:2});found++;}
        }
        logText=found>0?'🛡 Doppelwall! Alle '+found+' Türme unschlagbar (2 Züge)!':'🛡 Kein Turm gefunden.';
      } else if(ri===2){
        // R3: Alle eigenen Figuren 1 Zug unschlagbar
        let found=0;
        for(let r=0;r<8;r++)for(let c=0;c<8;c++){
          if(chess.board[r][c]?.col==='w'){chess.frozenSquares.push({r,c,turns:1});found++;}
        }
        logText='🛡 Festung! Alle '+found+' Figuren 1 Zug unschlagbar!';
      } else if(ri===3){
        // R4: Beide Türme 3 Züge unschlagbar + KI überspringt nächsten Zug
        let found=0;
        for(let r=0;r<8;r++)for(let c=0;c<8;c++){
          if(chess.board[r][c]?.t==='R'&&chess.board[r][c]?.col==='w'){chess.frozenSquares.push({r,c,turns:3});found++;}
        }
        chess.frozenEnemy=true;
        logText='🛡 Kaiserwall! Türme 3 Züge unschlagbar + KI überspringt Zug!';
      } else {
        // R5: Alle eigenen Figuren 2 Züge unschlagbar + KI überspringt Zug
        let found=0;
        for(let r=0;r<8;r++)for(let c=0;c<8;c++){
          if(chess.board[r][c]?.col==='w'){chess.frozenSquares.push({r,c,turns:2});found++;}
        }
        chess.frozenEnemy=true;
        logText='🛡 Unsterblichkeit! Alle Figuren 2 Züge unschlagbar + KI pausiert!';
      }
      break;

    // ── LÄUFER ─────────────────────────────────────────────────────
    case 'bishop_stab':{
      const getNeighborEnemies=(maxCount)=>{
        const targets=[];
        for(let r=0;r<8;r++)for(let c=0;c<8;c++){
          if(chess.board[r][c]?.t==='B'&&chess.board[r][c]?.col==='w'){
            [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>{
              const nr=r+dr,nc=c+dc;
              if(inB(nr,nc)&&chess.board[nr][nc]?.col==='b'&&chess.board[nr][nc].t!=='K')
                targets.push({r:nr,c:nc,v:PIECE_VAL[chess.board[nr][nc].t]||0});
            });
          }
        }
        // Sortiere nach Wert, entferne Duplikate
        const seen=new Set();
        return targets.filter(t=>{const k=t.r+','+t.c;if(seen.has(k))return false;seen.add(k);return true;})
          .sort((a,b)=>b.v-a.v).slice(0,maxCount);
      };

      if(ri===0){
        // R1: Wertvollste Nachbarfigur eines Läufers entfernen
        const hits=getNeighborEnemies(1);
        if(hits.length){const h=hits[0];chess.capturedByPlayer.push(chess.board[h.r][h.c]);chess.board[h.r][h.c]=null;logText='🗡 Dolchstoß! '+CHESS_SYMS['b'+chess.capturedByPlayer.at(-1).t]+' ausgeschaltet!';}
        else{chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);logText='🗡 Kein Ziel in Reichweite.';}
      } else if(ri===1){
        // R2: 2 Nachbarfiguren entfernen
        const hits=getNeighborEnemies(2);
        if(hits.length){hits.forEach(h=>{chess.capturedByPlayer.push(chess.board[h.r][h.c]);chess.board[h.r][h.c]=null;});logText='🗡 Doppeldolch! '+hits.length+' Figuren ausgeschaltet!';}
        else{chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);logText='🗡 Kein Ziel in Reichweite.';}
      } else if(ri===2){
        // R3: Wertvollste Figur auf dem Brett entfernen (nicht König)
        let best=null,bR=-1,bC=-1,bV=-1;
        for(let r=0;r<8;r++)for(let c=0;c<8;c++){
          const p=chess.board[r][c];
          if(p?.col==='b'&&p.t!=='K'){const v=PIECE_VAL[p.t]||0;if(v>bV){bV=v;best=p;bR=r;bC=c;}}
        }
        if(best){chess.capturedByPlayer.push(best);chess.board[bR][bC]=null;logText='🗡 Präzisionsschlag! '+CHESS_SYMS['b'+best.t]+' vernichtet!';}
        else{chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);logText='🗡 Kein Ziel gefunden.';}
      } else if(ri===3){
        // R4: Alle Figuren auf den Diagonalen des Läufers entfernen
        let count=0;
        for(let r=0;r<8;r++)for(let c=0;c<8;c++){
          if(chess.board[r][c]?.t==='B'&&chess.board[r][c]?.col==='w'){
            // Alle 4 Diagonalen
            [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>{
              let nr=r+dr,nc=c+dc;
              while(inB(nr,nc)){
                if(chess.board[nr][nc]?.col==='b'&&chess.board[nr][nc].t!=='K'){chess.capturedByPlayer.push(chess.board[nr][nc]);chess.board[nr][nc]=null;count++;}
                else if(chess.board[nr][nc]?.col==='w')break;
                nr+=dr;nc+=dc;
              }
            });
          }
        }
        logText=count>0?'🗡 Diagonalzorn! '+count+' Feinde auf den Diagonalen vernichtet!':'🗡 Keine Feinde auf den Diagonalen.';
      } else {
        // R5: 3 stärkste Feinde auf dem Brett entfernen
        const enemies=[];
        for(let r=0;r<8;r++)for(let c=0;c<8;c++){
          const p=chess.board[r][c];if(p?.col==='b'&&p.t!=='K')enemies.push({r,c,v:PIECE_VAL[p.t]||0});
        }
        enemies.sort((a,b)=>b.v-a.v).slice(0,3).forEach(e=>{chess.capturedByPlayer.push(chess.board[e.r][e.c]);chess.board[e.r][e.c]=null;});
        logText='🗡 Schattenhagel! '+Math.min(3,enemies.length)+' stärkste Feinde vernichtet!';
      }
      break;
    }

    // ── SPRINGER (unverändert — schon rang-basiert) ─────────────────
    case 'knight_magic':{
      const knights=[];
      for(let r=0;r<8;r++)for(let c=0;c<8;c++)
        if(chess.board[r][c]?.t==='N'&&chess.board[r][c]?.col==='w')knights.push({r,c});
      if(!knights.length){
        chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);
        chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);
        logText='✨ Kein Springer auf dem Brett.';break;
      }
      chess.knightAbilityPending={rankIdx:ri,knights};
      logText='✨ Arkaner Sprung! Klicke einen Springer an!';
      renderBoard();
      break;
    }

    // ── DAME FEUER ─────────────────────────────────────────────────
    case 'queen_fire':{
      let qR=-1,qC=-1;
      for(let r=0;r<8&&qR<0;r++)for(let c=0;c<8&&qR<0;c++)
        if(chess.board[r][c]?.t==='Q'&&chess.board[r][c]?.col==='w'){qR=r;qC=c;}
      const radius=ri===0?2:ri===1?3:ri===2?4:ri===3?5:99; // R5 = ganzes Brett
      let hits=0;
      if(qR>=0){
        for(let r=0;r<8;r++)for(let c=0;c<8;c++){
          if(chess.board[r][c]?.col==='b'&&chess.board[r][c].t!=='K'&&
            Math.abs(r-qR)<=radius&&Math.abs(c-qC)<=radius){
            chess.capturedByPlayer.push(chess.board[r][c]);chess.board[r][c]=null;hits++;
          }
        }
      }
      const names=['Feuerball','Flammensturm','Inferno','Sonnennova','Gottesfeuer'];
      logText=hits>0?'🔥 '+names[ri]+'! '+hits+' Figur(en) verbrannt!':'🔥 Kein Ziel in Reichweite!';
      if(!hits)chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);
      break;
    }

    // ── DAME WASSER ────────────────────────────────────────────────
    case 'queen_water':{
      let qr=-1,qc=-1;
      for(let r=0;r<8&&qr<0;r++)for(let c=0;c<8&&qr<0;c++)
        if(chess.board[r][c]?.t==='Q'&&chess.board[r][c]?.col==='w'){qr=r;qc=c;}
      const pushDist=ri===0?2:ri===1?3:ri===2?4:ri===3?5:8;
      let pushed=0;
      if(qr>=0){
        [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>{
          const nr=qr+dr,nc=qc+dc;
          if(inB(nr,nc)&&chess.board[nr][nc]?.col==='b'){
            // Schiebe so weit wie möglich in diese Richtung
            let tr=nr+dr*pushDist,tc=nc+dc*pushDist;
            // Finde nächstes freies Feld in Richtung
            let moved=false;
            for(let d=pushDist;d>=1;d--){
              const pr=nr+dr*d,pc=nc+dc*d;
              if(inB(pr,pc)&&!chess.board[pr][pc]){chess.board[pr][pc]=chess.board[nr][nc];chess.board[nr][nc]=null;pushed++;moved=true;break;}
            }
          }
        });
        // R4+: zieht auch weiter entfernte Feinde
        if(ri>=3){
          const range=ri===3?3:5;
          for(let r=0;r<8;r++)for(let c=0;c<8;c++){
            if(chess.board[r][c]?.col==='b'&&(Math.abs(r-qr)<=range||Math.abs(c-qc)<=range)){
              const dr=r===qr?0:r<qr?1:-1,dc=c===qc?0:c<qc?1:-1;
              for(let d=pushDist;d>=1;d--){
                const pr=r+dr*d,pc=c+dc*d;
                if(inB(pr,pc)&&!chess.board[pr][pc]){chess.board[pr][pc]=chess.board[r][c];chess.board[r][c]=null;pushed++;break;}
              }
            }
          }
        }
      }
      const names=['Flutwelle','Gezeiten','Tsunami','Maelstrom','Sintflut'];
      logText='🌊 '+names[ri]+'! '+pushed+' Figur(en) zurückgedrängt!';
      break;
    }

    // ── DAME ERDE ──────────────────────────────────────────────────
    case 'queen_earth':{
      const turns=ri===0?1:ri===1?2:ri===2?2:ri===3?3:3;
      const scope=ri<=1?'w':'all'; // R3+: auch Feinde einfrieren
      let count=0;
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){
        const p=chess.board[r][c];
        if(p&&(p.col==='w'||(scope==='all'&&p.col==='b'&&p.t!=='K'))){
          chess.frozenSquares.push({r,c,turns});count++;
        }
      }
      if(ri>=2&&scope==='all')chess.extraMove=true;
      const names=['Steinwall','Felsenfestung','Erdschild','Titanboden','Weltenstein'];
      logText='🏔 '+names[ri]+'! '+count+' Figuren '+turns+' Zug(e) unschlagbar'+(ri>=2?' + Extra-Zug!':'!');
      break;
    }

    // ── DAME WIND ──────────────────────────────────────────────────
    case 'queen_air':
      if(ri<=1){
        chess.extraMove=true;
        logText=ri===0?'🌪 Windstoß! Nochmal ziehen!':'🌪 Sturmböe! 2× Extra-Zug!';
        if(ri===1){chess.extraMove=true;} // wird eh nur 1× genutzt — stattdessen 2 Extra-Züge
      } else if(ri===2){
        chess.extraMove=true;
        // Teleportiert Dame auf ein zufälliges freies Feld
        let qr=-1,qc=-1;
        for(let r=0;r<8&&qr<0;r++)for(let c=0;c<8&&qr<0;c++)
          if(chess.board[r][c]?.t==='Q'&&chess.board[r][c]?.col==='w'){qr=r;qc=c;}
        const free=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(!chess.board[r][c])free.push({r,c});
        if(qr>=0&&free.length){const t=free[Math.floor(Math.random()*free.length)];chess.board[t.r][t.c]=chess.board[qr][qc];chess.board[qr][qc]=null;}
        logText='🌪 Wirbelwind! Dame teleportiert + Extra-Zug!';
      } else if(ri===3){
        chess.extraMove=true;
        // Alle eigenen Figuren dürfen sich 1 Feld bewegen (Extra-Züge)
        logText='🌪 Zyklone! Extra-Zug + alle Figuren aktiv!';
      } else {
        // R5: 3 Extra-Züge
        chess.extraMove=true;chess.extraMove2=true;chess.extraMove3=true;
        logText='🌪 Zeitschneide! 3 Extra-Züge!';
      }
      break;

    // ── DAME VITA ──────────────────────────────────────────────────
    case 'queen_vita':
      if(ri===0){
        // R1: 1 Figur zurückbringen
        if(chess.capturedByAI.length>0){
          const rev=chess.capturedByAI.pop();
          let placed=false;
          for(let c=0;c<8&&!placed;c++)if(!chess.board[7][c]){chess.board[7][c]={...rev,col:'w',moved:true};placed=true;}
          if(!placed)for(let r=5;r<8&&!placed;r++)for(let c=0;c<8&&!placed;c++)if(!chess.board[r][c]){chess.board[r][c]={...rev,col:'w',moved:true};placed=true;}
          logText='💚 Lebensquell! '+CHESS_SYMS['w'+rev.t]+' kehrt zurück!';
        } else{chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);logText='💚 Keine Figuren zum Zurückbringen.';}
      } else if(ri===1){
        // R2: 2 Figuren zurückbringen
        let count=0;
        for(let i=0;i<2&&chess.capturedByAI.length>0;i++){
          const rev=chess.capturedByAI.pop();let placed=false;
          for(let c=0;c<8&&!placed;c++)if(!chess.board[7][c]){chess.board[7][c]={...rev,col:'w',moved:true};placed=true;}
          if(!placed)for(let r=5;r<8&&!placed;r++)for(let c=0;c<8&&!placed;c++)if(!chess.board[r][c]){chess.board[r][c]={...rev,col:'w',moved:true};placed=true;}
          if(placed)count++;
        }
        logText=count>0?'💚 Wiedergeburt! '+count+' Figuren zurückgekehrt!':'💚 Keine Figuren zum Zurückbringen.';
        if(!count)chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);
      } else if(ri===2){
        // R3: Alle geschlagenen Figuren zurückbringen
        let count=0;
        while(chess.capturedByAI.length>0){
          const rev=chess.capturedByAI.pop();let placed=false;
          for(let r=5;r<8&&!placed;r++)for(let c=0;c<8&&!placed;c++)if(!chess.board[r][c]){chess.board[r][c]={...rev,col:'w',moved:true};placed=true;}
          if(placed)count++;
        }
        logText=count>0?'💚 Auferstehung! Alle '+count+' Figuren zurück!':'💚 Keine Figuren zum Zurückbringen.';
        if(!count)chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);
      } else {
        // R4/R5: Alle zurückbringen + Extra-Zug
        let count=0;
        while(chess.capturedByAI.length>0){
          const rev=chess.capturedByAI.pop();let placed=false;
          for(let r=5;r<8&&!placed;r++)for(let c=0;c<8&&!placed;c++)if(!chess.board[r][c]){chess.board[r][c]={...rev,col:'w',moved:true};placed=true;}
          if(placed)count++;
        }
        chess.extraMove=true;
        logText=count>0?'💚 Ewiges Leben! Alle '+count+' Figuren zurück + Extra-Zug!':'💚 Extra-Zug!';
      }
      break;

    // ── DAME PHYS ──────────────────────────────────────────────────
    case 'queen_phys':{
      const removeCount=ri===0?1:ri===1?2:ri===2?3:ri===3?4:99;
      let count=0;
      const enemies=[];
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){
        const p=chess.board[r][c];if(p?.col==='b'&&p.t!=='K')enemies.push({r,c,v:PIECE_VAL[p.t]||0});
      }
      enemies.sort((a,b)=>b.v-a.v).slice(0,removeCount===99?enemies.length:removeCount).forEach(e=>{
        chess.capturedByPlayer.push(chess.board[e.r][e.c]);chess.board[e.r][e.c]=null;count++;
      });
      const names=['Donnerschlag','Blitzschlag','Sturmschlag','Vernichtung','Götterzorn'];
      logText=count>0?'⚡ '+names[ri]+'! '+count+' Figur(en) vernichtet!':'⚡ Kein Ziel gefunden.';
      if(!count)chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);
      break;
    }

    // ── KÖNIG ──────────────────────────────────────────────────────
    case 'king_buff':{
      let kr=-1,kc=-1;
      for(let r=0;r<8&&kr<0;r++)for(let c=0;c<8&&kr<0;c++)
        if(chess.board[r][c]?.t==='K'&&chess.board[r][c]?.col==='w'){kr=r;kc=c;}
      if(kr<0){chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);logText='♔ Kein König gefunden!';break;}

      if(ri===0){
        // R1: Mit Nachbarfigur tauschen → dann noch normal ziehen
        const neighbors=[];
        for(const[dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){
          const nr=kr+dr,nc=kc+dc;
          if(inB(nr,nc)&&chess.board[nr][nc]?.col==='w'&&chess.board[nr][nc].t!=='K')neighbors.push({r:nr,c:nc});
        }
        if(!neighbors.length){chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);logText='♔ Keine Nachbarfigur zum Tauschen!';break;}
        chess.kingSwapPending={kr,kc,neighbors};
        chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);
        logText='♔ Königstausch! Wähle eine Nachbarfigur zum Tauschen!';
        renderBoard();
      } else if(ri===1){
        // R2: Tauschen + Extra-Zug direkt
        const neighbors=[];
        for(const[dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){
          const nr=kr+dr,nc=kc+dc;
          if(inB(nr,nc)&&chess.board[nr][nc]?.col==='w'&&chess.board[nr][nc].t!=='K')neighbors.push({r:nr,c:nc});
        }
        if(!neighbors.length){chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);logText='♔ Keine Nachbarfigur zum Tauschen!';break;}
        chess.kingSwapPending={kr,kc,neighbors,extraAfter:true};
        chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);
        logText='♔ Königsmanöver! Tauschen + Extra-Zug!';
        renderBoard();
      } else if(ri===2){
        // R3: Alle Nachbarn des Königs werden 1 Zug unschlagbar
        let count=0;
        for(const[dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){
          const nr=kr+dr,nc=kc+dc;
          if(inB(nr,nc)&&chess.board[nr][nc]?.col==='w'){chess.frozenSquares.push({r:nr,c:nc,turns:1});count++;}
        }
        chess.frozenSquares.push({r:kr,c:kc,turns:1});
        logText='♔ Königsaura! König + '+count+' Nachbarn 1 Zug unschlagbar!';
      } else if(ri===3){
        // R4: König teleportiert sich auf ein beliebiges freies Feld
        const free=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(!chess.board[r][c])free.push({r,c});
        if(free.length){
          const t=free[Math.floor(Math.random()*free.length)];
          chess.board[t.r][t.c]=chess.board[kr][kc];chess.board[kr][kc]=null;
          logText='♔ Königsteleport! König springt auf '+('abcdefgh'[t.c])+(8-t.r)+'!';
        } else{chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);logText='♔ Kein freies Feld!';}
      } else {
        // R5: König schlägt alle Nachbarfiguren (Feinde)
        let killed=0;
        for(const[dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){
          const nr=kr+dr,nc=kc+dc;
          if(inB(nr,nc)&&chess.board[nr][nc]?.col==='b'&&chess.board[nr][nc].t!=='K'){
            chess.capturedByPlayer.push(chess.board[nr][nc]);chess.board[nr][nc]=null;killed++;
          }
        }
        logText=killed>0?'♔ Königszorn! '+killed+' Feinde im Umkreis vernichtet!':'♔ Keine Feinde in Reichweite.';
        if(!killed)chess.abilitiesUsedCount=Math.max(0,(chess.abilitiesUsedCount||1)-1);chess._lastUsedUid&&chess.usedAbilityUids.delete(chess._lastUsedUid);
      }
      break;
    }

    default:
      logText='✨ '+desc;
  }

  if(logText)chess.moveLog.push({text:logText,ai:false,special:true});

  // Prüfe ob KI-König durch Fähigkeit geschlagen wurde → sofortiger Sieg
  let enemyKingAlive=false;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(chess.board[r][c]?.t==='K'&&chess.board[r][c]?.col==='b')enemyKingAlive=true;
  if(!enemyKingAlive){
    renderBoard();renderMoveLog();renderAbilities();
    chess.status='checkmate';
    showResult(true,'⚡ Fähigkeit trifft König! Du gewinnst!');
    return;
  }

  // Zeige verbleibende Fähigkeiten in Statusleiste
  const left=5-(chess.abilitiesUsedCount||0);
  if(left>0)setStatus('⚡ Fähigkeit eingesetzt! Noch '+left+' übrig.','#ffd45a');

  renderBoard();renderMoveLog();renderAbilities();
}

function showPromotionUI(r,c){
  setStatus('\u265B Bauernumwandlung! Wähle eine Figur:','#ffd45a');
  const el=q('#chess-board');if(!el)return;
  // Overlay over the promotion square cell
  const overlay=document.createElement('div');
  overlay.id='promo-overlay';
  overlay.style.cssText='position:absolute;inset:0;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;z-index:50;border-radius:6px;';
  overlay.innerHTML='<div style="font-size:.6rem;color:#ffd45a;letter-spacing:2px;margin-bottom:4px">UMWANDLUNG</div>'+
    '<div style="display:flex;gap:10px">'+
    [['Q','\u2655'],['R','\u2656'],['B','\u2657'],['N','\u2658']].map(([t,sym])=>
      `<button onclick="finishPromotion('${t}')" style="background:#2a1a5a;border:2px solid #ffd45a;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:1.6rem;color:#ffd45a;transition:all .2s" onmouseover="this.style.background='#5a41b0'" onmouseout="this.style.background='#2a1a5a'">${sym}</button>`
    ).join('')+
    '</div>';
  el.style.position='relative';
  el.appendChild(overlay);
}

function finishPromotion(pieceType){
  const overlay=q('#promo-overlay');if(overlay)overlay.remove();
  if(!chess.promotionPending)return;
  const {r,c}=chess.promotionPending;
  chess.board[r][c].t=pieceType;
  const sym=CHESS_SYMS['w'+pieceType];
  chess.moveLog.push({text:'\u265F\u2192'+sym+' Umwandlung auf '+'abcdefgh'[c]+(8-r)+'!',ai:false,special:true});
  if(pieceType==='Q'){trackQuestStat('promotions',1);G.questStats.promo3=G.questStats.promotions;G.questStats.promo5=G.questStats.promotions;}
  chess.promotionPending=null;
  const move=chess.lastMove;
  if(!chess.extraMove){chess.extraMove=false;}
  const nextCol='b';
  const nextMoves=getAllLegalMoves(chess.board,nextCol,move);
  const inCheck=isInCheck(chess.board,nextCol);
  if(nextMoves.length===0){
    renderBoard();renderMoveLog();renderCaptured();
    chess.status='checkmate';
    showResult(true,inCheck?'SCHACHMATT! Du gewinnst!':'PATT-SIEG! Du gewinnst!');
    return;
  }
  if(inCheck){setStatus('SCHACH! KI-König im Schach!','#ff8800');trackQuestStat('checks',1);}
  chess.turn='b';
  renderBoard();renderMoveLog();renderCaptured();
  renderAbilities();
  if(!chess.extraMove){
    setStatus('KI denkt\u2026','#888888');
    setTimeout(()=>aiTurn(),500);
  } else {
    chess.extraMove=false;
    setStatus('Extra-Zug! Wähle eine Figur','#ff9900');
  }
}

function showResult(won,text){
  const el=q('#game-result');if(!el)return;
  // Quest tracking
  trackQuestStat('fights',1);
  const byMatt=chess.status==='checkmate';
  trackEndOfGame(won===true, byMatt);

  // Sieg-Typ ermitteln
  let winType='';
  if(won===true){
    if(chess.status==='checkmate') winType='matt';
    else if(chess.status==='stalemate') winType='patt';
    else if(text&&text.includes('gibt auf')) winType='aufgabe';
    else if(text&&text.includes('Fähigkeit')) winType='faehigkeit';
    else winType='sieg';
  } else if(won===false){
    if(chess.status==='checkmate') winType='ki_matt';
    else winType='niederlage';
  } else {
    winType='unentschieden';
  }

  // Spielverlauf speichern
  if(!G.gameHistory)G.gameHistory=[];
  const now=new Date();
  const timeStr=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
  const dateStr=now.getDate()+'.'+(now.getMonth()+1)+'.';
  const rank=RANKS[G.rankIdx];
  const rankName=rank.name+(rank.tier?' '+rank.tier:'');
  G.gameHistory.unshift({
    result: won===true?'win':won===false?'loss':'draw',
    winType,
    rank: rankName,
    moves: chess.moveLog?.filter(m=>!m.special).length||0,
    time: dateStr+' '+timeStr,
  });
  if(G.gameHistory.length>30)G.gameHistory=G.gameHistory.slice(0,30); // max 30 Einträge
  save();
  renderGameHistory();
  let extra='';
  if(won===true){
    const r=onWin();
    const rank=RANKS[G.rankIdx];
    const _ce=100*(1+Math.floor(G.rankIdx/3));
    extra='<div style="display:flex;gap:10px;justify-content:center;margin:6px 0">'+
      
      '<span style="color:#ffd45a">+'+_ce+' \uD83D\uDCB0</span>'+
      '</div>';
    if(r.promoted){
      const _rrr=RANK_REWARDS[rank.name]||{};
      extra+=
        '<div style="background:linear-gradient(135deg,#2a1a5a,#2a1a5a);border:2px solid '+rank.color+';border-radius:10px;padding:10px;margin:8px 0;text-align:center">'+
        '<div style="font-size:1.2rem">\uD83C\uDF89 AUFGESTIEGEN!</div>'+
        '<div style="color:'+rank.color+';font-size:.9rem;font-weight:bold;margin:4px 0">'+rank.name+(rank.tier?' '+rank.tier:'')+'</div>'+
        '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:5px">'+
        
        (_rrr.coins?'<span style="color:#ffd45a;font-size:.8rem">+'+_rrr.coins.toLocaleString()+' \uD83D\uDCB0</span>':'')+
        '</div></div>';
    }
  } else if(won===false&&chess.status==='checkmate'){
    const r=onLoss();
    extra='<div style="color:#ffd45a;margin:4px 0;font-size:.75rem">+50 \uD83D\uDCB0</div>';
    if(r.demoted){
      extra+='<div style="color:#ff6644;margin:4px 0">\u2B07 ABGESTIEGEN: '+getEloRankName()+'</div>';
    } else {
      extra+='<div style="color:#ff9900;margin:6px 0">\u26A0\uFE0F Warnung! Noch 1 Niederlage \u2192 Abstieg</div>';
    }
  }
  el.style.display='block';
  el.innerHTML='<div style="text-align:center;padding:14px">'+
    '<div style="font-size:1.8rem;color:'+(won?'#ffd45a':won===null?'#ffd45a':'#ff5d8f')+'">'+
    (won?'\uD83C\uDFC6':won===null?'\uD83E\uDD1D':'\uD83D\uDC80')+' '+text+'</div>'+
    extra+
    '<div style="display:flex;gap:8px;justify-content:center;margin-top:12px">'+
    '<button class="cw-btn" onclick="startNewGame()">&#9822; Neu spielen</button>'+
    '<button class="cw-btn" onclick="bpAnalysis.show(chess.rec||[])" style="border-color:#bb55ff;color:#bb55ff">&#128270; Analyse</button>'+
    '<button class="cw-btn" onclick="chess.status=\'idle\';showPregameSelect()" style="border-color:#7be0ff;color:#7be0ff">&#9881;&#65039; Neu aufstellen</button>'+
    '</div></div>';
  setStatus(text,won?'#ffd45a':won===null?'#ffd45a':'#ff5d8f');
  stopMoveTimer();
  const hb=q('#draw-btn');if(hb)hb.style.display='none';
  updateTopBar();
}


// ============================================================
// QUEST SYSTEM
// ============================================================


// ============================================================
// SHOP
// ============================================================
const SHOP_ITEMS=[
  {id:'dragon', name:'Drachen-Set',  emoji:'D', price:100000,type:'pieceSkin'},
  {id:'jungle', name:'Dschungel-Set',emoji:'J', price:100000,type:'pieceSkin'},
  {id:'ocean_p',name:'Ozean-Set',    emoji:'O', price:100000,type:'pieceSkin'},
  {id:'space',  name:'Weltraum-Set', emoji:'S', price:100000,type:'pieceSkin'},
];
function showToast(msg,color){
  const old=q('#cw-toast');if(old)old.remove();
  const t=document.createElement('div');
  t.id='cw-toast';
  t.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#1a0f3a;border:1px solid '+(color||'#ffd45a')+';color:'+(color||'#ffd45a')+';padding:8px 18px;border-radius:10px;font-size:.65rem;font-weight:bold;z-index:9999;pointer-events:none;letter-spacing:1px;box-shadow:0 0 12px '+(color||'#ffd45a')+'66;animation:popIn .2s ease-out';
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2200);
}

function buyShopItem(itemId){
  const item=SHOP_ITEMS.find(i=>i.id===itemId);if(!item)return;
  if(!G.coins)G.coins=0;
  if(G.coins<item.price){
    showToast('❌ Nicht genug Münzen! ('+G.coins.toLocaleString()+' / '+item.price.toLocaleString()+' 💰)','#ff5d8f');
    return;
  }
  if(item.type==='pieceSkin'){
    if(G.shopOwned&&G.shopOwned[itemId]){showToast('✓ Bereits gekauft!','#888');return;}
    G.coins-=item.price;
    if(!G.shopOwned)G.shopOwned={};
    G.shopOwned[itemId]=true;
    showToast('✅ '+item.name+' freigeschaltet!','#4aff4a');
  }
  save();renderShopScreen();updateTopBar();
}
async function buyKeyPack(packId){
  const j=await cwApi('buy-keys',{packId:packId});
  if(!j.ok){showToast('❌ '+(j.error||'Fehler'),'#ff5d8f');return;}
  showToast('✅ Schlüssel gekauft 🔑','#4aff4a');
  renderShopScreen();updateTopBar();
}

function renderShopScreen(){
  const el=q('#shop-items');if(!el)return;
  const coinEl=q('#shop-coins');if(coinEl)coinEl.textContent=(G.coins||0).toLocaleString();
  el.innerHTML='';

  // ── Figuren-Skins ──
  const h1=document.createElement('div');
  h1.style.cssText='font-size:.6rem;color:#7be0ff;letter-spacing:1px;margin:4px 0 6px;text-align:center;text-shadow:0 0 8px #7be0ff66';
  h1.textContent='Figuren-Skins';el.appendChild(h1);
  const sg=document.createElement('div');
  sg.style.cssText='display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px';
  SHOP_ITEMS.filter(i=>i.type==='pieceSkin').forEach(item=>{
    const owned=!!(G.shopOwned&&G.shopOwned[item.id]);
    const can=(G.coins||0)>=item.price;
    const c=document.createElement('div');
    c.style.cssText='border:1px solid '+(owned?'#5a41b0':can?'#ffd45a66':'#2a1a5a')+';border-radius:10px;padding:10px 8px;text-align:center;background:#1a0f3a;opacity:'+(owned?'.7':'1');
    const sk=PIECE_SKINS[item.id==='ocean_p'?'ocean':item.id]||{};
    const sc=sk.glow||'#ffd45a';
    c.style.borderColor=sc;c.style.background='linear-gradient(180deg,'+sc+'22,#0006)';c.style.boxShadow='0 0 18px '+sc+'44';
    c.innerHTML='<div style="display:flex;justify-content:center">'+['P','N','Q'].map(function(t){return '<span style="width:46px;height:46px;display:block">'+chessPieceSVG(t,'w','dark',{body:sk.body||null,accent:'#e8ecf5'})+'</span>';}).join('')+'</div><div style="font-size:.62rem;color:'+sc+';margin:4px 0;letter-spacing:1px">'+item.name+'</div>';
    if(owned){
      c.innerHTML+='<div style="font-size:.55rem;color:#4aff4a">✓ Besitz</div>';
    }else{
      const btn=document.createElement('button');
      btn.style.cssText='margin-top:6px;width:100%;font-size:.5rem;padding:4px;background:#2a1a3a;border:1px solid '+(can?'#ffd45a':'#333')+';color:'+(can?'#ffd45a':'#9a8fc4')+';border-radius:4px;cursor:'+(can?'pointer':'default');
      btn.textContent=item.price.toLocaleString()+' 💰';
      btn.onclick=()=>buyShopItem(item.id);
      c.appendChild(btn);
    }
    sg.appendChild(c);
  });
  el.appendChild(sg);

  // ── Schlüssel kaufen ──
  const h2=document.createElement('div');
  h2.style.cssText='font-size:.6rem;color:#7be0ff;letter-spacing:1px;margin:4px 0 6px;text-align:center;text-shadow:0 0 8px #7be0ff66';
  h2.textContent='Schlüssel kaufen';el.appendChild(h2);

  // Brain-Pulse-Münzen (Konto)
  const coinInfo=document.createElement('div');
  coinInfo.style.cssText='font-size:.55rem;color:#ffd45a;text-align:center;margin-bottom:8px';
  coinInfo.textContent=CW_SERVER.loggedIn?('Brain-Pulse-Münzen: '+(CW_SERVER.bpCoins||0).toLocaleString()+' 🪙 · Schlüssel: '+G.keys+' 🔑 · Gratis-Schlüssel heute noch: '+CW_SERVER.freeKeysLeft):'Bitte in Brain Pulse einloggen, um Schlüssel zu nutzen.';
  el.appendChild(coinInfo);
  const kg=document.createElement('div');
  kg.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:6px';
  (CW_SERVER.packs||[]).forEach(function(p){
    const can=CW_SERVER.loggedIn&&(CW_SERVER.bpCoins||0)>=p.coins;
    const c=document.createElement('div');
    c.style.cssText='border:1px solid '+(can?'#ffd45a66':'#2a1a5a')+';border-radius:10px;padding:8px 4px;text-align:center;background:#1a0f3a';
    c.innerHTML='<div style="font-size:1.2rem">+'+p.keys+'🔑</div>';
    const btn=document.createElement('button');
    btn.style.cssText='width:100%;font-size:.48rem;padding:3px;background:#2a1a3a;border:1px solid '+(can?'#ffd45a':'#333')+';color:'+(can?'#ffd45a':'#9a8fc4')+';border-radius:4px;cursor:'+(can?'pointer':'default');
    btn.textContent=p.coins.toLocaleString()+' 🪙';
    btn.onclick=function(){if(can)buyKeyPack(p.id);};
    c.appendChild(btn);
    kg.appendChild(c);
  });
  el.appendChild(kg);
  const hint=document.createElement('div');
  hint.style.cssText='font-size:.48rem;color:#888;text-align:center;margin-top:8px';
  hint.textContent='Brain-Pulse-Münzen gibt es im Brain-Pulse-Shop.';
  el.appendChild(hint);
}
// ============================================================
// SCREENS
// ============================================================

let currentScreen='';

// Which variant is selected per group for pregame
// e.g. {dame:'v', bauer:'s', ...}
// pregameSetup: {group: [{v,ri}, ...]} — ein Eintrag pro Position
// Gruppen-Größen: turm:2, springer:2, laeufer:2, dame:1, koenig:1, bauer:8
// PREGAME_GROUP_SLOTS moved to top

function getAvailableRanksForGroup(group){
  // Gibt alle besessenen {v,ri,cnt} zurück
  const result=[];
  const pg=PIECE_GROUPS.find(p=>p.group===group);if(!pg)return result;
  pg.pids.forEach(pid=>{
    const v=pidVariant(pid);
    (G.inventory?.[group]?.[v]||[]).forEach((cnt,ri)=>{if(cnt>0)result.push({v,ri,cnt});});
  });
  return result;
}

function getDefaultPregameSetup(){
  const setup={};
  PIECE_GROUPS.forEach(pg=>{
    const group=pg.group;
    const slots=PREGAME_GROUP_SLOTS[group]||1;
    const avail=getAvailableRanksForGroup(group);

    // Sortiere aufsteigend nach Rang (normale zuerst, seltene ans Ende)
    const sorted=[...avail].sort((a,b)=>a.ri-b.ri);

    // Pool aufbauen: zuerst viele normale, dann seltene
    const pool=[];
    sorted.forEach(o=>{
      for(let i=0;i<o.cnt&&pool.length<slots;i++)
        pool.push({v:o.v,ri:o.ri});
    });

    // Immer alle Slots füllen — fehlende mit Basis-Rang (Rang 0, erste verfügbare Variante)
    const fallback={v:pg.pids[0]?pidVariant(pg.pids[0]):'s',ri:0};
    while(pool.length<slots)pool.push({...fallback});
    setup[group]=pool.slice(0,slots);
  });
  if(setup.dame)G.selectedDame=setup.dame[0]?.v||'';
  return setup;
}

let pregameSetup={};
// currentPickerPos: {group, posIdx} — welche Position gerade bearbeitet wird
let currentPickerPos=null;

const PREGAME_LAYOUT_BACK=['R','N','B','Q','K','B','N','R'];
const PREGAME_LAYOUT_PAWNS=['P','P','P','P','P','P','P','P'];
const TYPE_TO_GROUP={R:'turm',N:'springer',B:'laeufer',Q:'dame',K:'koenig',P:'bauer'};

// Zählt wie viele Slots im Setup bereits einen bestimmten {v,ri} nutzen
function countUsedSlots(group,v,ri,excludePos){
  const slots=pregameSetup[group]||[];
  return slots.filter((s,i)=>i!==excludePos&&s.v===v&&s.ri===ri).length;
}

function openPiecePicker(group,posIdx){
  currentPickerPos={group,posIdx};
  const pg=PIECE_GROUPS.find(p=>p.group===group);if(!pg)return;
  const avail=getAvailableRanksForGroup(group);
  if(!avail.length)return;

  const modal=q('#piece-picker-modal');
  const grid=q('#ppm-grid');
  const title=q('#ppm-title');
  if(!modal||!grid)return;

  const cp0=COLL_PIECES[pg.pids[0]];
  title.textContent=(cp0?cp0.name.toUpperCase():group.toUpperCase())+' – POSITION '+(posIdx+1);
  grid.innerHTML='';

  const cur=pregameSetup[group]?.[posIdx];

  avail.forEach(opt=>{
    const pid=pg.pids.find(p=>pidVariant(p)===opt.v)||pg.pids[0];
    const cp=COLL_PIECES[pid];if(!cp)return;
    const rd=RARITIES[RARITY_ORDER[opt.ri]];
    const used=countUsedSlots(group,opt.v,opt.ri,posIdx);
    const remaining=opt.cnt-used;
    const canSelect=remaining>0;
    const isSelected=cur&&cur.v===opt.v&&cur.ri===opt.ri;

    const row=document.createElement('div');
    row.style.cssText=
      'display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;'+
      'border:2px solid '+(isSelected?rd.color:canSelect?'#5a41b0':'#2a1a5a')+';'+
      'background:'+(isSelected?rd.bg+'44':canSelect?'#1a0f3a':'#070400')+';'+
      'cursor:'+(canSelect?'pointer':'default')+';opacity:'+(canSelect?'1':'0.4')+';transition:all .15s;';
    if(canSelect&&!isSelected){
      row.onmouseenter=()=>row.style.borderColor='#5a41b0';
      row.onmouseleave=()=>row.style.borderColor='#5a41b0';
    }
    row.innerHTML=
      '<span style="font-size:2rem;color:'+rd.color+';filter:drop-shadow(0 0 6px '+rd.color+'88)">'+cp.chess+'</span>'+
      '<div style="flex:1">'+
        '<div style="font-size:.75rem;font-weight:bold;color:'+rd.color+'">'+getPieceRankName(group,RARITY_ORDER[opt.ri])+'</div>'+
        '<div style="font-size:.6rem;color:#888;margin-top:1px">'+opt.cnt+'× besessen &bull; '+remaining+' noch verfügbar</div>'+
      '</div>'+
      (isSelected?'<span style="color:'+rd.color+';font-size:1.2rem">✓</span>':'');
    if(canSelect){
      row.onclick=()=>{
        pregameSetup[group][posIdx]={v:opt.v,ri:opt.ri};
        if(group==='dame')G.selectedDame=opt.v;
        save();
        closePiecePicker();
        renderPregameBoard();
      };
    }
    grid.appendChild(row);
  });

  modal.style.display='flex';
}

function closePiecePicker(){
  const m=q('#piece-picker-modal');if(m)m.style.display='none';
  currentPickerPos=null;
}

function cycleVariant(group){ openPiecePicker(group,0); }

function renderPregameBoard(){
  const el=q('#pregame-board');if(!el)return;
  el.innerHTML='';

  // Baue eine flache Liste: [{type,group,posIdx}] für Grundlinie dann Bauern
  // Nur Slots die tatsächlich besetzt sind anzeigen (laut ownedCount)
  const rows=[PREGAME_LAYOUT_BACK,PREGAME_LAYOUT_PAWNS];
  // Immer alle Brett-Positionen anzeigen (BOARD_NEEDS), nicht nach Karten-Anzahl
  const slotCount={};
  PIECE_GROUPS.forEach(pg=>{
    slotCount[pg.group]=PREGAME_GROUP_SLOTS[pg.group]||1;
  });
  // Positions-Index pro Gruppe
  const posCounter={};

  rows.forEach((rowTypes,rowIdx)=>{
    rowTypes.forEach((type,col)=>{
      const group=TYPE_TO_GROUP[type];
      if(posCounter[group]===undefined)posCounter[group]=0;
      const posIdx=posCounter[group];
      const slots=slotCount[group]||0;
      const hasSlot=posIdx<slots;
      posCounter[group]++;

      const cell=document.createElement('div');
      const isLight=(rowIdx+col)%2===0;
      cell.style.cssText=
        'aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;'+
        'background:'+(isLight?'#5a41b0':'#1a0f3a')+';position:relative;transition:all .2s;';

      const sel=pregameSetup[group]?.[posIdx]||{v:'s',ri:0};
      const rd=RARITIES[RARITY_ORDER[sel.ri]]||RARITIES.normal;
      const isRare=sel.ri>0;
      const avail=getAvailableRanksForGroup(group);
      const hasChoice=avail.length>0;
      if(hasChoice){
        cell.style.cursor='pointer';
        cell.onmouseenter=()=>cell.style.background=isLight?'#5a41b0':'#5a41b0';
        cell.onmouseleave=()=>{cell.style.background=isLight?'#5a41b0':'#1a0f3a';};
        cell.onclick=()=>openPiecePicker(group,posIdx);
      }
      if(isRare)cell.style.boxShadow='inset 0 0 0 2px '+rd.color+'99';
      cell.innerHTML=
        '<span style="width:78%;max-width:44px;display:block;line-height:0">'+chessPieceSVG(type,'w','dark',{accent:sel.ri>0?rd.color:null,rank:sel.ri})+'</span>'+
        '<span style="font-size:.32rem;color:'+rd.color+';letter-spacing:.5px;line-height:1;margin-top:1px">R'+(sel.ri+1)+'</span>'+
        (isRare?'<span style="position:absolute;top:1px;left:2px;font-size:.38rem;color:'+rd.color+';font-weight:bold">★</span>':'')+
        (hasChoice?'<span style="position:absolute;top:1px;right:2px;font-size:.45rem;color:'+rd.color+'66">⇄</span>':'');

      el.appendChild(cell);
    });
  });
}

function showPregameSelect(){
  const pg=q('#pregame-select');
  const board=q('#chess-board');
  const status=q('#chess-status');
  const abilityBar=q('#ability-bar');
  const moveLog=q('#move-log');
  const capRow=q('.captured-row');
  const gameResult=q('#game-result');
  if(pg)pg.style.display='flex';
  if(board)board.style.display='none';
  if(status)status.style.display='none';
  if(abilityBar)abilityBar.style.display='none';
  if(moveLog)moveLog.style.display='none';
  if(capRow)capRow.style.display='none';
  if(gameResult)gameResult.style.display='none';
  // Gespeicherte Aufstellung laden oder Standard nehmen
  if(G.pregameSetup && Object.keys(G.pregameSetup).length>0){
    pregameSetup=G.pregameSetup;
  } else {
    pregameSetup=getDefaultPregameSetup();
  }
  renderPregameBoard();
}

function confirmDameAndStart(){
  const pg=q('#pregame-select');
  const board=q('#chess-board');
  const status=q('#chess-status');
  const abilityBar=q('#ability-bar');
  const moveLog=q('#move-log');
  const capRow=q('.captured-row');
  if(pg)pg.style.display='none';
  if(board)board.style.display='';
  if(status)status.style.display='';
  if(abilityBar)abilityBar.style.display='';
  if(moveLog)moveLog.style.display='';
  if(capRow)capRow.style.display='';
  startNewGame();
}

function renderDameSelector(){
  const el=q('#dame-selector');if(!el)return;
  const damePids=PIECE_GROUPS.find(p=>p.group==='dame').pids;
  const owned=damePids.filter(pid=>(G.inventory?.dame?.[pidVariant(pid)]||[]).some(c=>c>0));
  if(owned.length<=1){el.style.display='none';return;}
  el.style.display='block';
  el.innerHTML='<div style="font-size:.52rem;color:#5a41b0;letter-spacing:1px;text-align:center;margin-bottom:5px">MAGIERIN W\u00C4HLEN</div>';
  const row=document.createElement('div');
  row.style.cssText='display:flex;gap:5px;justify-content:center;flex-wrap:wrap;';
  owned.forEach(pid=>{
    const cp=COLL_PIECES[pid];
    const v=pidVariant(pid);
    const isSel=G.selectedDame===v;
    const counts=G.inventory?.dame?.[v]||[];
    const bestRi=counts.reduce((b,c,i)=>c>0?i:b,-1);
    const rd=bestRi>=0?RARITIES[RARITY_ORDER[bestRi]]:RARITIES.normal;
    const btn=document.createElement('button');
    btn.style.cssText='padding:5px 9px;border-radius:8px;border:2px solid '+(isSel?rd.color:'#221500')+';background:'+(isSel?rd.bg:'#1a0f3a')+';color:'+(isSel?rd.color:'#443322')+';font-size:.72rem;cursor:pointer;'+(isSel?'box-shadow:0 0 8px '+rd.glow+';':'');
    btn.textContent=cp.chess+' '+cp.variant;
    btn.onclick=()=>{
      G.selectedDame=v;save();
      renderDameSelector();
      if(chess.status==='playing')renderAbilities();
    };
    row.appendChild(btn);
  });
  el.appendChild(row);
}

function showScreen(id){
  closeChessSpieleModal();
  document.querySelectorAll('.cw-screen').forEach(s=>s.style.display='none');
  const el=q('#s-'+id);if(el)el.style.display='flex';
  currentScreen=id;
  updateTopBar();
  if(id==='home')renderHome();
  if(id==='play'){if(chess.status==='idle')showPregameSelect();else renderDameSelector();renderGameHistory();}
  if(id==='quests')renderQuestScreen();
  if(id==='shop'){renderChestScreen();renderShopScreen();}
  if(id==='collection'){renderCollection();skinTab('brett');}
}

function updateTopBar(){
  const kb=q('#tb-keys');if(kb)kb.textContent=G.keys;
  const cb=q('#tb-coins');if(cb)cb.textContent=(G.coins||0).toLocaleString();
  const rk=q('#tb-rank');if(rk){rk.textContent=getEloRankName();rk.style.color=RANKS[G.rankIdx].color;}
}

function renderHome(){
  renderGameHistory();
  const r=RANKS[G.rankIdx];
  const rn=getEloRankName();
  if(q('#h-rank')){q('#h-rank').textContent=rn;q('#h-rank').style.color=r.color;}
  if(q('#h-keys'))q('#h-keys').textContent=G.keys;
  const wn=r.winsNeeded;
  if(q('#h-streak'))q('#h-streak').textContent=G.winStreak+(wn?' / '+wn:' / MAX');
  if(q('#h-record'))q('#h-record').textContent=G.totalWins+'S / '+(G.totalFights-G.totalWins)+'N';
  // Abstiegs-Warnung anzeigen
  const warnEl=q('#h-loss-warn');
  if(warnEl){
    if(G.lossStreak===1&&G.rankIdx>0){
      warnEl.textContent='\u26A0\uFE0F Noch 1 Niederlage \u2192 Abstieg!';
      warnEl.style.display='block';
    } else {
      warnEl.style.display='none';
    }
  }
  const pct=wn?Math.min(100,G.winStreak/wn*100):100;
  if(q('#h-sbar')){q('#h-sbar').style.width=pct+'%';q('#h-sbar').style.background=r.color;}
  // Rang-Leiter
  const ladder=q('#rank-ladder');if(!ladder)return;
  ladder.innerHTML='';
  // Rang-Medaillen Emojis
  const rankMedals={'Amateur':'\u26AA','Bronze':'\uD83E\uDD49','Silber':'\uD83E\uDD48','Gold':'\uD83E\uDD47','Platin':'\uD83D\uDCA0','Diamant':'\uD83D\uDC8E','Meister':'\uD83D\uDD25','Grandmeister':'\uD83D\uDC51','Legende':'\u2B50'};
  RANKS.forEach((rk,i)=>{
    const name=rk.tier>0?rk.name+' '+rk.tier:rk.name;
    const isCurrent=i===G.rankIdx;
    const isDone=i<G.rankIdx;
    const isFuture=i>G.rankIdx;
    const medal=rankMedals[rk.name]||'\u25CB';
    const row=document.createElement('div');
    // Current: glowing border. Done: subtle colored. Future: dark
    let rowStyle='display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;margin-bottom:3px;transition:all .2s;';
    if(isCurrent){
      rowStyle+='background:linear-gradient(135deg,'+rk.color+'22,'+rk.color+'11);border:1px solid '+rk.color+';box-shadow:0 0 12px '+rk.color+'55;';
    } else if(isDone){
      rowStyle+='background:'+rk.color+'0a;border:1px solid '+rk.color+'44;';
    } else {
      rowStyle+='background:#1a0f3a;border:1px solid #1a1400;';
    }
    row.style.cssText=rowStyle;
    const nameColor=isCurrent?rk.color:isDone?rk.color+'cc':'#2a2010';
    const icon=isCurrent?'\u25B6':isDone?'\u2713':'';
    const rew=RANK_REWARDS[rk.name];
    let rewHtml='';
    if(rew&&!isDone){const chips=[];if(rew.keys)chips.push('\uD83D\uDD11+'+rew.keys);if(rew.coins)chips.push('\uD83D\uDCB0+'+rew.coins.toLocaleString());if(rew.boardSkin)chips.push('\uD83C\uDFA8Brett');if(rew.pieceSkin)chips.push('\u265F Figuren');
    if(chips.length){rewHtml='<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:3px">';chips.forEach(c=>{rewHtml+='<span style="font-size:.45rem;background:#1a0f3a;border:1px solid '+rk.color+'44;border-radius:4px;padding:1px 4px;color:'+rk.color+'">'+c+'</span>';});rewHtml+='</div>';}}
    row.innerHTML=
      '<div style="flex:1;min-width:0">'+
      '<div style="display:flex;align-items:center;gap:6px">'+
      '<span style="font-size:.9rem;filter:'+(isFuture?'grayscale(1) brightness(.3)':'none')+'">'+medal+'</span>'+
      '<span style="font-size:.72rem;font-weight:'+(isCurrent?'bold':'normal')+';color:'+nameColor+';'+(isCurrent?'text-shadow:0 0 8px '+rk.color+'88;':'')+'">'+name+'</span>'+
      (isCurrent&&wn?'<span style="font-size:.6rem;color:'+rk.color+';font-weight:bold">'+G.winStreak+'/'+wn+'</span>':'')+
      (isCurrent&&G.lossStreak===1?'<span style="font-size:.55rem;color:#ff9900">\u26A0</span>':'')+
      (!isDone&&!isCurrent&&rk.winsNeeded?'<span style="font-size:.52rem;color:#2a2010">'+rk.winsNeeded+' Siege</span>':'')+
      (!rk.winsNeeded&&isCurrent?'<span style="font-size:.55rem;color:'+rk.color+'">MAX</span>':'')+
      (icon?'<span style="font-size:.6rem;color:'+nameColor+'">'+icon+'</span>':'')+
      '</div>'+rewHtml+'</div>';
    ladder.appendChild(row);
  });
}

// Figuren-Gruppen für Inventar (6 Hauptfiguren)
// PIECE_GROUPS moved to top

function pidVariant(pid){return pid.split('_').pop();}

// Passiv-Boni pro Gruppe und Rang (Index 0-4)
const PIECE_PASSIVES = {
  bauer:   [null,'Vorwärts-Schlag: Kann auch geradeaus schlagen','Dauersprint: Darf immer 2 Felder ziehen','Schnelle Beförderung: +1 extra Bauer beim Aufwerten','Unaufhaltbar: Kann nicht durch Bauern geschlagen werden'],
  turm:    [null,'Startschutz: Beginnt mit 1 Schutzschicht','Festungswall: KI zieht nie zuerst auf den Turm','Doppelschutz: Beginnt mit 2 Schutzschichten','Unsterblich: Kehrt 1× nach Schlag zurück'],
  laeufer: [null,'Schatten-Tritt: 1× pro Spiel orthogonal ziehen','Durchdringen: Zieht durch eigene Figuren hindurch','Hinterhalt: KI greift Läufer nicht als erstes an','Farbwechsel: Kann auf allen Feldern ziehen'],
  springer:[null,'Schutzaura: Startet unschlagbar für 1 Zug','Doppel-Fähigkeit: Arkaner Sprung ist 2× nutzbar','Gegenangriff: Nach jedem KI-Zug sofort nochmal ziehen','Landungsschlag: Schlägt eine Figur beim Landen'],
  dame:    [null,'Doppel-Fähigkeit: Elementar-Kraft 2× nutzbar','Magischer Schild: Startet unschlagbar für 1 Zug','Erweiterte Reichweite: +2 Felder Fähigkeits-Radius','Zeitloser Angriff: Fähigkeit verbraucht keinen Zug'],
  koenig:  [null,'Starkes Kommando: Kriegsruf gibt 2 Extra-Züge','Feldherr: Alle Figuren starten mit 1 Schutzschicht','Kaiserliche Aura: König erste 3 Züge unschlagbar','Legende: König teleportiert sich bei Schlagversuch']
};

// ── Pro Rang: {aktiv, passiv} für jede Variante ────────────────────
const RANK_ABILITIES = {
  bauer_s: [
    {aktiv:'Geisterpfad — Bauer schlägt diesen Zug auch vorwärts.', passiv:null},
    {aktiv:'Schildblock — blockiert einmal einen Angreifer (2 Züge Schutz)', passiv:'Kann Angreifer einmal abwehren'},
    {aktiv:'Speerstoß — droht 2 Felder diagonal + Extra-Zug', passiv:'Droht 2 Felder diagonal'},
    {aktiv:'Eisenwille — alle Bauern überleben nächsten Treffer', passiv:'Überlebt ersten Treffer automatisch'},
    {aktiv:'Königsgarde-Aura — alle Nachbarn 1 Zug unschlagbar', passiv:'Alle Nachbarfiguren erhalten +1 Schutz'},
  ],
  bauer_b: [
    {aktiv:'Fernschuss — schlägt 1 Feld diagonal ohne Bewegung (Basis)', passiv:null},
    {aktiv:'Fernschuss — schlägt 1 Feld diagonal ohne Bewegung', passiv:'Kann diagonal schlagen ohne zu ziehen'},
    {aktiv:'Bogenhagel — alle Bauern schlagen bis 2 Felder diagonal', passiv:'Reichweite 2 Felder diagonal'},
    {aktiv:'Doppelschuss — trifft 2 Feinde in Reichweite gleichzeitig', passiv:'Zwei Angriffe pro Fähigkeit'},
    {aktiv:'Präzisionsschuss — eliminiert stärkste Figur in Radius 2', passiv:'Zielt immer auf stärkste Figur in Reichweite'},
  ],
  bauer_sh: [
    {aktiv:'Schutzschild — gibt Nachbarfigur 1 Zug Schutz (Basis)', passiv:null},
    {aktiv:'Schutzschild — gibt Nachbarfigur 1 Zug Schutz', passiv:'Kann Nachbarfiguren schützen'},
    {aktiv:'Opfer — gibt sich für König hin, König 2 Züge unschlagbar', passiv:'Kann sich für den König opfern'},
    {aktiv:'Schildmauer — alle Bauern 1 Zug unschlagbar', passiv:'Alle Bauern starten mit Schutzschicht'},
    {aktiv:'Eisenwand — vorderste Figur jeder Spalte 2 Züge unschlagbar', passiv:'Ganze Front 2 Züge unschlagbar'},
  ],
  bauer_a: [
    {aktiv:'Dolchstoß — schlägt Figur direkt vor ihm ohne Bewegung (Basis)', passiv:null},
    {aktiv:'Dolchstoß — schlägt Figur direkt vor ihm ohne Bewegung', passiv:'Kann geradeaus schlagen'},
    {aktiv:'Unsichtbar — 3 Züge Schutz + schlägt vorwärts', passiv:'KI greift Mörder nicht gezielt an'},
    {aktiv:'Schattenklinge — schlägt stärkste Nachbarfigur + Extra-Zug', passiv:'Schlägt und springt zurück'},
    {aktiv:'Königsmörder — eliminiert wertvollste Nachbarfigur', passiv:'Zielt immer auf wertvollste benachbarte Figur'},
  ],
  bauer_be: [
    {aktiv:'Raserei — schlägt vorwärts + Extra-Zug (Basis)', passiv:null},
    {aktiv:'Raserei — schlägt vorwärts + Extra-Zug', passiv:'Extra-Zug nach jedem Schlag'},
    {aktiv:'Wut — schlägt vorwärts UND rückwärts + Extra-Zug', passiv:'Kann auch rückwärts schlagen'},
    {aktiv:'Blutrausch — stärker nach Kill + Extra-Zug', passiv:'Jeder Schlag erhöht Angriffskraft'},
    {aktiv:'Götterzorn — schlägt ALLE Feinde in seiner Spalte', passiv:'Vernichtet gesamte Spalte'},
  ],
  bauer_h: [
    {aktiv:'Heilung — bringt zuletzt geschlagenen Bauern zurück (Basis)', passiv:null},
    {aktiv:'Heilung — bringt zuletzt geschlagenen Bauern zurück', passiv:'Kann Bauern wiederbeleben'},
    {aktiv:'Segnung — gibt Nachbarfiguren 2 Züge Schutz', passiv:'Heilt Nachbarn passiv'},
    {aktiv:'Auferstehung — bringt beliebige geschlagene Figur zurück', passiv:'Kann jede Figur wiederbeleben'},
    {aktiv:'Massenheilung — alle geschlagenen Bauern kehren zurück', passiv:'Alle Bauern werden wiederbelebt'},
  ],
  turm_s: [
    {aktiv:'Schutzwall — Turm 2 Züge unschlagbar (Basis)', passiv:null},
    {aktiv:'Schutzwall — 1 Turm 2 Züge unschlagbar', passiv:'Startschutz: beginnt mit 1 Schutzschicht'},
    {aktiv:'Festung — beide Türme 2 Züge unschlagbar', passiv:'KI zieht nie zuerst auf den Turm'},
    {aktiv:'Kaiserwall — alle Figuren 1 Zug + KI gesperrt', passiv:'Beginnt mit 2 Schutzschichten'},
    {aktiv:'Unzerstörbar — 2 Figuren 3 Züge Schutz + KI pausiert', passiv:'Absoluter Schutz, durchbricht gegnerischen Schutz'},
  ],
  laeufer_d: [
    {aktiv:'Dolchstoß — entfernt 1 benachbarten Feind (Basis)', passiv:null},
    {aktiv:'Dolchstoß — entfernt 1 benachbarten Feind', passiv:'1× orthogonal ziehen pro Spiel'},
    {aktiv:'Doppelstich — entfernt 2 benachbarte Feinde', passiv:'Zieht durch eigene Figuren hindurch'},
    {aktiv:'Geisterdolch — entfernt wertvollste Figur auf dem Brett', passiv:'KI greift Läufer nicht als erstes an'},
    {aktiv:'Dreifachstich — entfernt 3 stärkste Feinde', passiv:'Maximale Reichweite auf allen Diagonalen'},
  ],
  springer_m: [
    {aktiv:'Arkaner Sprung — 2 Zufalls-Sprünge mit Schlag (Basis)', passiv:null},
    {aktiv:'Arkaner Sprung — 2 Zufalls-Sprünge mit Schlag', passiv:'Startet unschlagbar für 1 Zug'},
    {aktiv:'Arkaner Sprung — 3 Zufalls-Sprünge', passiv:'Fähigkeit 2× nutzbar'},
    {aktiv:'Magierpfad — 2 wählbare Sprünge (Kurvenregel)', passiv:'Nach KI-Zug sofort nochmal ziehen'},
    {aktiv:'Meisterpfad — 5 wählbare Sprünge', passiv:'Unbegrenzte Sprungkombinationen'},
  ],
  dame_f: [
    {aktiv:'Feuerball — verbrennt alle Feinde in Radius 2 (Basis)', passiv:null},
    {aktiv:'Feuerball — verbrennt alle Feinde in Radius 2', passiv:'Fähigkeit 2× nutzbar'},
    {aktiv:'Flammensturm — verbrennt alle Feinde in Radius 3', passiv:'Startet unschlagbar für 1 Zug'},
    {aktiv:'Inferno — verbrennt alle Feinde in Radius 4', passiv:'+2 Felder Fähigkeits-Radius'},
    {aktiv:'Gottesfeuer — Sofortschlag + 1 Feind brennt 3 Runden', passiv:'Brenneffekt: getroffene Feinde sterben nach 3 Zügen'},
  ],
  dame_w: [
    {aktiv:'Flutwelle — schiebt Feinde 2 Felder zurück (Basis)', passiv:null},
    {aktiv:'Welle — Reihe vor Dame 1 Feld zurück', passiv:'Fähigkeit 2× nutzbar'},
    {aktiv:'Flut — Reihe vor Dame 2 Felder zurück', passiv:'Startet unschlagbar für 1 Zug'},
    {aktiv:'Tsunami — 3 Spalten vor Dame 3 Felder zurück', passiv:'+2 Felder Schubdistanz'},
    {aktiv:'Sintflut — ganzes Brett, alle Feinde 3 Felder zurück', passiv:'Alle Feinde gleichzeitig'},
  ],
  dame_e: [
    {aktiv:'Steinwall — alle eigenen Figuren 1 Zug unschlagbar (Basis)', passiv:null},
    {aktiv:'Steinwall — alle eigenen Figuren 1 Zug unschlagbar', passiv:'Fähigkeit 2× nutzbar'},
    {aktiv:'Felsenfestung — alle eigenen Figuren 2 Züge unschlagbar', passiv:'Startet unschlagbar für 1 Zug'},
    {aktiv:'Erdschild — alle Figuren 2 Züge + Extra-Zug', passiv:'+2 Felder Fähigkeits-Radius'},
    {aktiv:'Weltenstein — 3 Züge + Extra-Zug + König unschlagbar', passiv:'König erhält dauerhaften Schutz'},
  ],
  dame_l: [
    {aktiv:'Windstoß — Dame bewegt sich sofort ein zweites Mal (Basis)', passiv:null},
    {aktiv:'Windstoß — 1 Extra-Zug', passiv:'Fähigkeit 2× nutzbar'},
    {aktiv:'Sturmbö — 2 Extra-Züge', passiv:'Startet unschlagbar für 1 Zug'},
    {aktiv:'Wirbelwind — Dame teleportiert auf freies Feld + Extra-Zug', passiv:'+2 Felder Fähigkeits-Radius'},
    {aktiv:'Zeitschneide — 3 Extra-Züge', passiv:'Fähigkeit verbraucht keinen Zug'},
  ],
  dame_v: [
    {aktiv:'Lebensquell — bringt zuletzt geschlagene eigene Figur zurück (Basis)', passiv:null},
    {aktiv:'Lebensquell — bringt 1 geschlagene Figur zurück', passiv:'Fähigkeit 2× nutzbar'},
    {aktiv:'Lebensfluss — bringt 2 geschlagene Figuren zurück', passiv:'Startet unschlagbar für 1 Zug'},
    {aktiv:'Auferstehung — bringt alle geschlagenen Figuren zurück', passiv:'+2 Felder Fähigkeits-Radius'},
    {aktiv:'Göttliche Gnade — alle zurück + Extra-Zug + König unschlagbar', passiv:'König erhält dauerhaften Lebensschutz'},
  ],
  dame_p: [
    {aktiv:'Donnerschlag — entfernt wertvollste Gegnerfigur (Basis)', passiv:null},
    {aktiv:'Donnerschlag — entfernt wertvollste Figur', passiv:'Fähigkeit 2× nutzbar'},
    {aktiv:'Doppelschlag — entfernt 2 stärkste Figuren', passiv:'Startet unschlagbar für 1 Zug'},
    {aktiv:'Dreifachschlag — entfernt 3 stärkste Figuren', passiv:'+2 Felder Fähigkeits-Radius'},
    {aktiv:'Götterschlag — entfernt ALLE Feinde auf dem Brett', passiv:'Maximale Vernichtungskraft'},
  ],
  koenig_b: [
    {aktiv:'Königstausch — tauscht König mit Nachbarfigur, dann normal ziehen (Basis)', passiv:null},
    {aktiv:'Königstausch — tauscht mit Nachbarfigur die Position', passiv:'Kriegsruf gibt 2 Extra-Züge'},
    {aktiv:'Königsmanöver — tauscht + Extra-Zug', passiv:'Alle Figuren starten mit 1 Schutzschicht'},
    {aktiv:'Königsbefehl — holt geschlagenen Turm zurück', passiv:'König erste 3 Züge unschlagbar'},
    {aktiv:'Königszorn — Turm zurück + schlägt alle Nachbarn', passiv:'Maximale Königsmacht'},
  ],
};



function renderCollection(){
  const el=q('#col-grid');if(!el)return;
  el.innerHTML='';
  PIECE_GROUPS.forEach(pg=>{
    let bestRankIdx=-1,totalOwned=0;
    if(G.inventory?.[pg.group]){
      pg.pids.forEach(pid=>{
        const v=pidVariant(pid);
        (G.inventory[pg.group][v]||[]).forEach((cnt,ri)=>{
          if(cnt>0){totalOwned+=cnt;if(ri>bestRankIdx)bestRankIdx=ri;}
        });
      });
    }
    const bestRd=bestRankIdx>=0?RARITIES[RARITY_ORDER[bestRankIdx]]:null;
    const card=document.createElement('div');
    card.className='inv-card'+(totalOwned>0?' inv-owned':' inv-locked');
    if(bestRd){card.style.borderColor=bestRd.color;card.style.boxShadow='0 0 12px '+bestRd.glow;}
    card.onclick=()=>{if(totalOwned>0)showGroupDetail(pg.group);};
    card.innerHTML=
      '<div style="font-size:2.8rem;line-height:1;'+(totalOwned===0?'opacity:.2':'')+'">'+pg.chess+'</div>'+
      '<div style="font-size:.8rem;font-weight:bold;color:'+(bestRd?bestRd.color:'#333')+';margin-top:4px">'+pg.name+'</div>'+
      (bestRankIdx>=0
        ?'<div style="font-size:.6rem;color:'+bestRd.color+';letter-spacing:1px">'+(PIECE_RANKS[pg.group]?.[bestRankIdx]||'')+'</div>'
        :'<div style="font-size:.6rem;color:#333">—</div>')+
      '<div style="font-size:.58rem;color:#555;margin-top:4px">'+totalOwned+'×</div>';
    el.appendChild(card);
  });
}

let gmdPid='', gmdRankIdx=0;
function fillGmDetail(pid,rankIdx){
  gmdPid=pid; gmdRankIdx=rankIdx;
  const cp=COLL_PIECES[pid];if(!cp)return;
  const v=pidVariant(pid);
  const rar=RARITY_ORDER[rankIdx];
  const rd=RARITIES[rar];
  const cnt=(G.inventory?.[cp.group]?.[v]?.[rankIdx])||0;
  const rankName=getPieceRankName(cp.group,rar);
  const box=q('#gm-detail');if(!box)return;
  box.style.display='block';
  box.style.borderColor=rd.color;
  q('#gmd-chess').textContent=cp.chess;q('#gmd-chess').style.color=rd.color;
  q('#gmd-name').textContent=rankName;q('#gmd-name').style.color=rd.color;
  q('#gmd-var').textContent=cp.variant;
  q('#gmd-rr').textContent=rd.label;q('#gmd-rr').style.color=rd.color;
  q('#gmd-cnt').textContent=cnt+' Stück';
  // Rang-spezifische Fähigkeit
  const abilData=RANK_ABILITIES[pid]?.[rankIdx];
  const abilText=abilData
    ?('⚡ '+cp.abilityLabel+': '+(abilData.aktiv||cp.desc)+(abilData.passiv?' | 🛡 '+abilData.passiv:''))
    :('⚡ '+cp.abilityLabel+': '+cp.desc);
  q('#gmd-ab').textContent=abilText;
  const nd=q('#gmd-next');
  const lu=q('#gmd-levelup');
  if(rankIdx<4){
    const nextRar=RARITY_ORDER[rankIdx+1];
    const nextRd=RARITIES[nextRar];
    const nextRankName=getPieceRankName(cp.group,nextRar);
    nd.textContent='⬆ Nächster Rang: '+nextRankName;
    nd.style.color=nextRd.color;
    const luStats=q('#gmd-lu-stats');
    if(luStats)luStats.style.display='none';
    const nextPassive=PIECE_PASSIVES[cp.group]?.[rankIdx+1];
    const luPassive=q('#gmd-lu-passive');
    if(luPassive){
      if(nextPassive){luPassive.innerHTML='★ Neues Passiv: <span style="color:#fff">'+nextPassive+'</span>';luPassive.style.display='block';}
      else{luPassive.style.display='none';}
    }
    // Entwickeln-Button befüllen
    const canUp=canRankUp(cp.group,v,rankIdx);
    const coinCost=DEVELOP_COIN_COSTS[rankIdx]||100000;
    const hasCards=cnt>=COMBINE_COST;
    const hasCoins=(G.coins||0)>=coinCost;
    const need=BOARD_NEEDS[cp.group]||1;
    const afterThis=cnt-COMBINE_COST;
    let otherRanks=0;
    for(let ri=0;ri<5;ri++){if(ri!==rankIdx)otherRanks+=(G.inventory?.[cp.group]?.[v]?.[ri])||0;}
    otherRanks+=1;
    const totalAfter=afterThis+otherRanks;
    const hasBoardMin=totalAfter>=need;
    const dpEl=q('#gmd-dp');
    if(dpEl)dpEl.innerHTML=
      '<span style="color:'+(hasCards?'#4aff4a':'#ff5d8f')+'">'+cnt+' / '+COMBINE_COST+' Karten</span>'+
      ' &nbsp; <span style="color:'+(hasCoins?'#ffd45a':'#ff5d8f')+'">'+(G.coins||0).toLocaleString()+' / '+coinCost.toLocaleString()+' 💰</span>'+
      (!hasBoardMin&&hasCards?'<div style="color:#ff9900;font-size:.5rem;margin-top:2px">⚠️ Zu wenig übrig für Brett (min. '+need+')</div>':'');
    const btn=q('#gmd-combine-btn');
    if(btn){
      btn.disabled=!canUp;
      btn.textContent='⚡ ENTWICKELN  '+COMBINE_COST+' Karten + '+coinCost.toLocaleString()+' 💰';
      btn.style.opacity=canUp?'1':'0.4';
      btn.style.cursor=canUp?'pointer':'default';
      btn.style.borderColor=canUp?'#ffd45a':'#3a2a00';
      btn.style.color=canUp?'#ffd45a':'#5a41b0';
    }
    if(lu)lu.style.display='block';
  } else {
    nd.textContent='★ MAXIMALER RANG!';
    nd.style.color='#ffd45a';
    if(lu)lu.style.display='none';
  }
}

function tryGmdCombine(){
  if(!gmdPid)return;
  const cp=COLL_PIECES[gmdPid];if(!cp)return;
  const v=pidVariant(gmdPid);
  if(doRankUp(cp.group,v,gmdRankIdx)){
    showToast('⚡ Entwickelt! '+getPieceRankName(cp.group,RARITY_ORDER[gmdRankIdx+1]),'#ffd45a');
    fillGmDetail(gmdPid,gmdRankIdx);
  } else {
    showToast('❌ Entwicklung fehlgeschlagen','#ff5d8f');
  }
}

function showGroupDetail(group){
  const pg=PIECE_GROUPS.find(p=>p.group===group);if(!pg)return;
  const modal=q('#group-modal');if(!modal)return;
  q('#gm-chess').textContent=pg.chess;
  q('#gm-name').textContent=pg.name;
  // Auto-fill detail with best owned piece
  let bestPid=null,bestRi=-1;
  pg.pids.forEach(pid=>{
    const v=pidVariant(pid);
    (G.inventory?.[pg.group]?.[v]||[]).forEach((cnt,ri)=>{
      if(cnt>0&&ri>bestRi){bestRi=ri;bestPid=pid;}
    });
  });
  if(bestPid)fillGmDetail(bestPid,bestRi);
  else if(q('#gm-detail'))q('#gm-detail').style.display='none';
  const grid=q('#gm-grid');
  grid.innerHTML='';
  grid.style.cssText='display:flex;flex-direction:column;gap:10px;';
  pg.pids.forEach(pid=>{
    const cp=COLL_PIECES[pid];
    const v=pidVariant(pid);
    // Varianten-Header
    const vhdr=document.createElement('div');
    vhdr.style.cssText='font-size:.78rem;color:#ffd45a;font-weight:bold;margin-top:4px;border-bottom:1px solid #5a41b0;padding-bottom:5px;display:flex;align-items:center;gap:6px';
    vhdr.innerHTML='<span style="font-size:1.1rem">'+cp.chess+'</span><span>'+cp.variant+'</span><span style="font-size:.55rem;color:#5a4020;font-weight:normal">'+cp.abilityLabel+'</span>';
    grid.appendChild(vhdr);
    // Rang-Zeilen (vertikal, volle Breite)
    RARITY_ORDER.forEach((rar,ri)=>{
      const rd=RARITIES[rar];
      const cnt=(G.inventory?.[group]?.[v]?.[ri])||0;
      const rankName=getPieceRankName(group,rar);
      const canUp=canRankUp(group,v,ri);
      const passive=PIECE_PASSIVES[group]?.[ri];
      const row=document.createElement('div');
      row.style.cssText=
        'display:flex;align-items:center;gap:10px;padding:10px 12px'
        +';border:2px solid '+(cnt>0?rd.color:'#2a1a5a')
        +';border-radius:10px;background:'+(cnt>0?rd.bg:'#060400')
        +';box-shadow:'+(cnt>0?'0 0 10px '+rd.glow+'55':'none')
        +';opacity:'+(cnt>0?'1':'0.4')
        +';cursor:'+(cnt>0?'pointer':'default');
      if(cnt>0) row.onclick=()=>fillGmDetail(pid,ri);
      // Anzahl Badge
      const badge=document.createElement('div');
      badge.style.cssText='min-width:44px;text-align:center;flex-shrink:0';
      badge.innerHTML='<div style="font-size:1.6rem;font-weight:bold;color:'+(cnt>0?rd.color:'#333')+'">'+cnt+'</div>'
        +'<div style="font-size:.55rem;color:#5a41b0">Karten</div>';
      // Info
      const info=document.createElement('div');
      info.style.cssText='flex:1;min-width:0';
      // Rang-spezifische Fähigkeit aus RANK_ABILITIES
      const abilData=RANK_ABILITIES[pid]?.[ri];
      const abilText=abilData?(abilData.aktiv||cp.desc):cp.desc;
      const passivText=abilData?.passiv||null;
      info.innerHTML=
        '<div style="font-size:.78rem;font-weight:bold;color:'+(cnt>0?rd.color:'#2a1a5a')+'">'+rankName+'</div>'
        +'<div style="font-size:.54rem;color:'+(cnt>0?'#ccc':'#2a1200')+';margin-top:2px;line-height:1.4">'+abilText+'</div>'
        +(passivText&&cnt>0
          ?'<div style="font-size:.52rem;color:#aa8800;margin-top:2px">🛡 '+passivText+'</div>'
          :'');
      // Entwickeln Button oder Fortschritt
      const right=document.createElement('div');
      right.style.cssText='flex-shrink:0;text-align:right';
      if(canUp){
        const cc=DEVELOP_COIN_COSTS[ri]||100000;
        right.innerHTML='<button onclick="event.stopPropagation();rankUpAndRefresh(\''+group+'\',\''+v+'\','+ri+')" '
          +'style="font-size:.58rem;padding:6px 10px;background:#2a1a5a;border:1px solid #ffd45a;color:#ffd45a;border-radius:6px;cursor:pointer;white-space:nowrap">⚡ '+cc.toLocaleString()+' 💰</button>';
      } else if(ri<4){
        const cc=DEVELOP_COIN_COSTS[ri]||100000;
        const needCards=Math.max(0,COMBINE_COST-cnt);
        const needCoins=Math.max(0,cc-(G.coins||0));
        right.innerHTML='<div style="font-size:.52rem;color:#5a41b0;line-height:1.5">'
          +(needCards>0?'<div>+'+needCards+' Karten</div>':'')
          +(needCoins>0?'<div>+'+needCoins.toLocaleString()+' 💰</div>':'')
          +(needCards===0&&needCoins===0?'<div style="color:#5a41b0">Max Rang</div>':'')
          +'</div>';
      } else {
        right.innerHTML='<div style="font-size:.6rem;color:#ffd45a">★ MAX</div>';
      }
      row.appendChild(badge);
      row.appendChild(info);
      row.appendChild(right);
      grid.appendChild(row);
    });
  });
  modal.style.display='flex';
}
function rankUpAndRefresh(group,variant,rankIdx){
  if(doRankUp(group,variant,rankIdx)){
    showToast('⚡ Entwickelt! → '+getPieceRankName(group,RARITY_ORDER[rankIdx+1]),'#ffd45a');
    // Finde pid für diese Gruppe+Variante
    const pg=PIECE_GROUPS.find(p=>p.group===group);
    const pid=pg?.pids.find(p=>pidVariant(p)===variant)||pg?.pids[0];
    showGroupDetail(group);
    // Direkt den neuen Rang anzeigen
    if(pid)fillGmDetail(pid,rankIdx+1);
  } else {
    showToast('❌ Entwicklung nicht möglich','#ff5d8f');
  }
}
function closeGroupDetail(){q('#group-modal').style.display='none';}

let dPid='',dRankIdx=0;
function showDetail(pid,rankIdx){
  dPid=pid;dRankIdx=rankIdx;
  const cp=COLL_PIECES[pid];
  const v=pidVariant(pid);
  const rar=RARITY_ORDER[rankIdx];
  const rd=RARITIES[rar];
  const cnt=(G.inventory?.[cp.group]?.[v]?.[rankIdx])||0;
  const rankName=getPieceRankName(cp.group,rar);
  const canUp=canRankUp(cp.group,v,rankIdx);

  q('#dm-ch').textContent=cp.chess;q('#dm-ch').style.color=rd.color;
  q('#dm-nm').textContent=rankName;
  q('#dm-var').textContent=cp.variant;q('#dm-var').style.color='#888';
  q('#dm-rr').textContent=rd.label;q('#dm-rr').style.color=rd.color;
  q('#dm-lv').textContent=cnt+' St\u00FCck';
  // Rang-spezifische Fähigkeitsbeschreibung
  const abilData=RANK_ABILITIES[dPid]?.[rankIdx];
  const abilText=abilData
    ?('\u26A1 '+cp.abilityLabel+': '+(abilData.aktiv||cp.desc)+(abilData.passiv?' \u2502 \uD83D\uDEE1 '+abilData.passiv:''))
    :('\u26A1 '+cp.abilityLabel+': '+cp.desc);
  q('#dm-ab').textContent=abilText;
  const coinCost=DEVELOP_COIN_COSTS[rankIdx]||100000;
  const hasCards=cnt>=COMBINE_COST;
  const hasCoins=(G.coins||0)>=coinCost;
  const need=BOARD_NEEDS[cp.group]||1;
  const afterThis=cnt-COMBINE_COST;
  let otherRanks=0;
  for(let ri=0;ri<5;ri++){if(ri===rankIdx)otherRanks+=(G.inventory?.[cp.group]?.[v]?.[ri])||0;}
  // fix: exclude current rank from otherRanks
  otherRanks=0;
  for(let ri=0;ri<5;ri++){if(ri!==rankIdx)otherRanks+=(G.inventory?.[cp.group]?.[v]?.[ri])||0;}
  otherRanks+=1;
  const totalAfter=afterThis+otherRanks;
  const hasBoardMin=totalAfter>=need;
  q('#dm-dp').innerHTML=
    '<span style="color:'+(hasCards?'#4aff4a':'#ff5d8f')+'">'+cnt+' / '+COMBINE_COST+' Karten</span>'+
    ' &nbsp; <span style="color:'+(hasCoins?'#ffd45a':'#ff5d8f')+'">'+
    (G.coins||0).toLocaleString()+' / '+coinCost.toLocaleString()+' &#128176;</span>'+
    (!hasBoardMin&&hasCards?'<div style="color:#ff9900;font-size:.5rem;margin-top:3px">⚠️ Zu wenig übrig für das Brett (benötigt: '+need+' Figuren)</div>':'');
  // Combine button
  const btn=q('#dm-combine-btn');
  const wrap=q('#dm-combine-wrap');
  if(btn&&wrap){
    if(rankIdx>=4){
      wrap.style.display='none';
    } else {
      wrap.style.display='block';
      btn.disabled=!canUp;
      btn.textContent='\u26A1 ENTWICKELN  '+COMBINE_COST+' Karten + '+coinCost.toLocaleString()+' \uD83D\uDCB0';
      btn.style.opacity=canUp?'1':'0.4';
      btn.style.cursor=canUp?'pointer':'default';
      btn.style.borderColor=canUp?'#ffd45a':'#3a2a00';
      btn.style.color=canUp?'#ffd45a':'#5a41b0';
    }
  }
  const nextRank=rankIdx<4?getPieceRankName(cp.group,RARITY_ORDER[rankIdx+1]):'MAX';
  q('#dm-next').textContent=rankIdx<4?'\u2B06 N\u00E4chster Rang: '+nextRank:'\u2605 MAXIMALER RANG erreicht!';
  q('#dm-next').style.color=rankIdx<4?'#888':'#ffd45a';

  q('#detail-modal').style.display='flex';
}

function tryCombineFromModal(){
  if(dPid===null||dRankIdx===null)return;
  const cp=COLL_PIECES[dPid];
  const v=pidVariant(dPid);
  if(doRankUp(cp.group,v,dRankIdx)){
    // Stay on same rank idx — if upgraded, show new count
    showDetail(dPid,dRankIdx);
  }
}

function closeDetail(){q('#detail-modal').style.display='none';}

function renderChestChanceTable(){
  const el=q('#chest-chances');if(!el)return;
  // Gesamtgewicht berechnen
  const total=Object.values(PIECE_WEIGHTS).reduce((a,b)=>a+b,0);
  // Gruppen zusammenfassen
  const groups=[
    {label:'Bauern',    color:'#6aaa6a', keys:['bauer_s','bauer_b','bauer_sh','bauer_a','bauer_be','bauer_h']},
    {label:'Turm',      color:'#4488ff', keys:['turm_s']},
    {label:'Springer',  color:'#4488ff', keys:['springer_m']},
    {label:'Läufer',    color:'#4488ff', keys:['laeufer_d']},
    {label:'König',     color:'#bb55ff', keys:['koenig_b']},
    {label:'Dame',      color:'#ffd45a', keys:['dame_f','dame_w','dame_e','dame_l','dame_v','dame_p']},
  ];
  let html='<div style="display:flex;flex-direction:column;gap:5px">';
  groups.forEach(g=>{
    const w=g.keys.reduce((a,k)=>a+(PIECE_WEIGHTS[k]||0),0);
    const pct=Math.round(w/total*100);
    html+=
      '<div style="display:flex;align-items:center;gap:6px">'+
        '<div style="width:52px;font-size:.55rem;color:'+g.color+';flex-shrink:0">'+g.label+'</div>'+
        '<div style="flex:1;background:#1a0f3a;border-radius:3px;height:8px;overflow:hidden">'+
          '<div style="height:100%;width:'+pct+'%;background:'+g.color+';border-radius:3px;transition:width .4s"></div>'+
        '</div>'+
        '<div style="width:28px;font-size:.55rem;color:'+g.color+';text-align:right;flex-shrink:0">'+pct+'%</div>'+
      '</div>';
  });
  html+='</div>';
  // Kisten-spezifische Chancen
  html+='<div style="margin-top:10px;display:flex;flex-direction:column;gap:4px">';
  const chests=[
    {name:'Normal',    color:'var(--gold)', rates:'Rang 1: 89% · Rang 2: 11%'},
    {name:'Episch',    color:'#bb55ff',     rates:'Rang 2: 80% · Rang 3: 20%'},
    {name:'Legendär',  color:'#ffd45a',     rates:'Rang 1+2 garantiert · Rang 4-5 sicher'},
  ];
  chests.forEach(c=>{
    html+=
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #2a1a5a">'+
        '<span style="font-size:.55rem;color:'+c.color+';font-weight:bold">'+c.name+'</span>'+
        '<span style="font-size:.5rem;color:#5a41b0">'+c.rates+'</span>'+
      '</div>';
  });
  html+='</div>';
  el.innerHTML=html;
}

function renderChestScreen(){
  cwRefreshKeys().then(function(){if(q('#chest-keys'))q('#chest-keys').textContent=G.keys;});
  if(q('#chest-keys'))q('#chest-keys').textContent=G.keys;
  if(q('#chest-coins'))q('#chest-coins').textContent=(G.coins||0).toLocaleString();
  if(q('#chest-result')){q('#chest-result').innerHTML='';q('#chest-result').style.borderColor='transparent';q('#chest-result').style.padding='0';q('#chest-result').style.background='transparent';q('#chest-result').style.boxShadow='none';}
  renderChestChanceTable();
}

function closeChestModal(){
  const m=q('#chest-modal');if(m)m.style.display='none';
  const ap=q('#chest-anim-phase');if(ap)ap.style.display='flex';
  const rp=q('#chest-result-phase');if(rp)rp.style.display='none';
}

async function doOpenChest(type){
  try{
    if(window.__cwOpening)return;window.__cwOpening=true;
    let res;try{res=await openChest(type);}finally{window.__cwOpening=false;}
    if(!res||res.error){ showToast('❌ '+((res&&res.error)||'Nicht genug Schlüssel!'),'#ff5d8f'); return; }
    updateTopBar();

    const results=res.results;
    const coinBonus=res.coinBonus||0;
    const bestRd=results.reduce((best,r)=>{
      return RARITY_ORDER.indexOf(r.rarityKey)>RARITY_ORDER.indexOf(best.rarityKey)?r:best;
    },results[0]);
    const rd=RARITIES[bestRd.rarityKey]||RARITIES.normal;
    const typeLabel=type==='normal'?'📦 NORMALE KISTE':type==='epic'?'💜 EPISCHE KISTE':'👑 LEGENDÄRE KISTE';
    const typeEmoji=type==='normal'?'📦':type==='epic'?'💜':'👑';

    // Karten HTML
    const grouped={};
    results.forEach(r=>{
      const key=r.pid+'_'+r.rarityKey;
      if(!grouped[key])grouped[key]={...r,count:0};
      grouped[key].count++;
    });
    const cardsHTML=Object.values(grouped).map((r,idx)=>{
      const cp=COLL_PIECES[r.pid];if(!cp)return '';
      const rrd=RARITIES[r.rarityKey]||RARITIES.normal;
      const rankName=getPieceRankName(cp.group,r.rarityKey);
      const rankIdx=RARITY_ORDER.indexOf(r.rarityKey);
      const isNew=((G.inventory?.[cp.group]?.[pidVariant(r.pid)]?.[rankIdx]||0)-r.count)<=0;
      return '<div style="border:2px solid '+rrd.color+';border-radius:12px;padding:10px 8px;text-align:center;'
        +'min-width:80px;max-width:90px;background:'+rrd.bg+';box-shadow:0 0 12px '+rrd.glow+';'
        +'position:relative;flex:0 0 auto;animation:cardFloat .35s ease-out both;animation-delay:'+(idx*0.07)+'s">'
        +(isNew?'<div style="position:absolute;top:-8px;right:-8px;background:#ff5d8f;color:#fff;font-size:.42rem;font-weight:bold;border-radius:8px;padding:2px 6px">NEU!</div>'
          :r.count>1?'<div style="position:absolute;top:-8px;right:-8px;background:#ffd45a;color:#000;font-size:.48rem;font-weight:bold;border-radius:8px;padding:2px 6px">×'+r.count+'</div>':'')
        +'<div style="font-size:2.2rem;line-height:1.2">'+cp.chess+'</div>'
        +'<div style="font-size:.62rem;color:'+rrd.color+';font-weight:bold;letter-spacing:1px;margin-top:3px">'+rrd.label+'</div>'
        +'<div style="font-size:.55rem;color:#ccc;margin-top:2px;font-weight:bold">'+cp.name+'</div>'
        +'<div style="font-size:.48rem;color:#888;margin-top:1px">'+rankName+'</div>'
        +'<div style="font-size:.44rem;color:#aaa;margin-top:4px;border-top:1px solid '+rrd.color+'44;padding-top:4px">⚡ '+cp.abilityLabel+'</div>'
        +'</div>';
    }).join('');

    // Modal direkt per getElementById setzen
    const modal=document.getElementById('chest-modal');
    if(!modal){console.error('chest-modal nicht gefunden!');return;}

    document.getElementById('chest-modal-title').textContent=typeLabel;
    document.getElementById('chest-modal-title').style.color=rd.color;
    document.getElementById('chest-modal-coins').innerHTML=coinBonus>0
      ?'<span style="background:#2a1a5a;border:1px solid #ffd45a;border-radius:8px;padding:4px 14px;color:#ffd45a;font-size:.72rem">+'+coinBonus.toLocaleString()+' 💰 Münzen!</span>':'';
    document.getElementById('chest-modal-items').innerHTML=cardsHTML;
    document.getElementById('chest-modal-inner').style.borderColor=rd.color;
    document.getElementById('chest-modal-inner').style.boxShadow='0 0 30px '+rd.glow;

    const animPhase=document.getElementById('chest-anim-phase');
    const resultPhase=document.getElementById('chest-result-phase');
    const icon=document.getElementById('chest-anim-icon');
    const label=document.getElementById('chest-anim-label');
    const glow=document.getElementById('chest-anim-glow');

    icon.textContent=typeEmoji;
    icon.className='';
    icon.style.fontSize='5rem';
    label.textContent='ÖFFNE KISTE...';
    label.style.color=rd.color;
    glow.style.background=rd.color;
    glow.style.opacity='0';
    animPhase.style.display='flex';
    resultPhase.style.display='none';
    modal.style.display='flex';

    // Animation
    setTimeout(()=>{ icon.classList.add('chest-anim-shake'); glow.style.opacity='1'; },50);
    setTimeout(()=>{ icon.classList.remove('chest-anim-shake'); icon.classList.add('chest-anim-pop'); label.textContent='✨'; },700);
    setTimeout(()=>{ animPhase.style.display='none'; resultPhase.style.display='block'; },1150);

  }catch(e){
    console.error('doOpenChest Fehler:',e);
    showToast('Fehler beim Öffnen: '+e.message,'#ff5d8f');
  }
}

function q(s){return document.querySelector(s);}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded',function(){
  load();initStarters();cwRefreshKeys().then(function(){try{renderShopScreen();}catch(e){}return cwLoadInv();});
  setTimeout(function(){
    showScreen('play');
    navSet(0);
  },50);
  setTimeout(renderQuestBadge,200);
});

// ============================================================
// QUEST SYSTEM
// ============================================================

const QUEST_CATEGORIES=[
  {id:'anfaenger',  label:'Anfänger',   color:'#888888'},
  {id:'grundlagen', label:'Grundlagen', color:'#cd7f32'},
  {id:'rang1',      label:'Rang 1',     color:'#c0c0c0'},
  {id:'rang2',      label:'Rang 2',     color:'#7be0ff'},
  {id:'rang3',      label:'Rang 3',     color:'#ff9900'},
  {id:'rang4',      label:'Rang 4',     color:'#7be0ff'},
  {id:'rang5',      label:'Rang 5',     color:'#ffd45a'},
  {id:'legende',     label:'⭐ Legende',  color:'#ff88ff', unlockRank:20},
];

// reward: {keys, label}
const QUESTS=[
  // ── ANFÄNGER ────────────────────────────────────────────────
  {id:'q_win1',     cat:'anfaenger', label:'Gewinne dein erstes Spiel',              stat:'wins',         target:1,   reward:{coins:300,  label:'+300 💰'}},
  {id:'q_win3',     cat:'anfaenger', label:'Gewinne 3 Spiele',                       stat:'wins',         target:3,   reward:{coins:600,  label:'+600 💰'}},
  {id:'q_win5',     cat:'anfaenger', label:'Gewinne 5 Spiele',                       stat:'wins',         target:5,   reward:{coins:1000, label:'+1.000 💰'}},
  {id:'q_play10',   cat:'anfaenger', label:'Spiele 10 Partien',                      stat:'fights',       target:10,  reward:{coins:800,  label:'+800 💰'}},
  {id:'q_check1',   cat:'anfaenger', label:'Setze einmal Schach',                    stat:'checks',       target:1,   reward:{coins:300,  label:'+300 💰'}},
  {id:'q_cap10',    cat:'anfaenger', label:'Schlage 10 Figuren insgesamt',           stat:'captures',     target:10,  reward:{coins:500,  label:'+500 💰'}},
  {id:'q_matt1',    cat:'anfaenger', label:'Gewinne ein Spiel durch Schachmatt',     stat:'matts',        target:1,   reward:{coins:800,  label:'+800 💰'}},
  {id:'q_roch1',    cat:'anfaenger', label:'Führe eine Rochade durch',               stat:'castles',      target:1,   reward:{coins:400,  label:'+400 💰'}},

  // ── GRUNDLAGEN ──────────────────────────────────────────────
  {id:'q_pawn1',    cat:'grundlagen', label:'Bringe 1 Bauern auf die gegnerische Grundlinie',      stat:'pawnReached',   target:1,   reward:{coins:800,   label:'+800 💰'}},
  {id:'q_pawn3',    cat:'grundlagen', label:'Bringe 3 Bauern auf die gegnerische Grundlinie',      stat:'pawnReached',   target:3,   reward:{keys:1,      label:'1 🔑'}},
  {id:'q_pawn5',    cat:'grundlagen', label:'Bringe 5 Bauern auf die gegnerische Grundlinie',      stat:'pawnReached',   target:5,   reward:{keys:2,      label:'2 🔑'}},
  {id:'q_cap25',    cat:'grundlagen', label:'Schlage insgesamt 25 gegnerische Figuren',            stat:'cap25',         target:25,  reward:{coins:1200,  label:'+1.200 💰'}},
  {id:'q_cap50',    cat:'grundlagen', label:'Schlage insgesamt 50 gegnerische Figuren',            stat:'cap50',         target:50,  reward:{keys:2,      label:'2 🔑'}},
  {id:'q_captRook', cat:'grundlagen', label:'Schlage einen gegnerischen Turm',                    stat:'capturedRooks', target:1,   reward:{coins:600,   label:'+600 💰'}},
  {id:'q_captRook5',cat:'grundlagen', label:'Schlage 5 gegnerische Türme',                        stat:'capturedRooks', target:5,   reward:{keys:1,      label:'1 🔑'}},
  {id:'q_captQueen',cat:'grundlagen', label:'Schlage eine gegnerische Dame',                      stat:'capturedQueens',target:1,   reward:{coins:1000,  label:'+1.000 💰'}},
  {id:'q_captQueen3',cat:'grundlagen',label:'Schlage 3 gegnerische Damen',                        stat:'capturedQueens',target:3,   reward:{keys:2,      label:'2 🔑'}},
  {id:'q_promo1',   cat:'grundlagen', label:'Verwandle einen Bauern in eine Dame',                stat:'promotions',    target:1,   reward:{coins:1000,  label:'+1.000 💰'}},
  {id:'q_promo3',   cat:'grundlagen', label:'Verwandle 3 Bauern in Damen',                        stat:'promo3',        target:3,   reward:{keys:2,      label:'2 🔑'}},
  {id:'q_promo5',   cat:'grundlagen', label:'Verwandle 5 Bauern in Damen',                        stat:'promo5',        target:5,   reward:{keys:4,      label:'4 🔑'}},
  {id:'q_check20',  cat:'grundlagen', label:'Setze 20-mal Schach',                               stat:'checks',        target:20,  reward:{coins:1500,  label:'+1.500 💰'}},
  {id:'q_check50',  cat:'grundlagen', label:'Setze 50-mal Schach',                               stat:'check50',       target:50,  reward:{keys:3,      label:'3 🔑'}},
  {id:'q_win10',    cat:'grundlagen', label:'Gewinne insgesamt 10 Spiele',                        stat:'win10',         target:10,  reward:{keys:2,      label:'2 🔑'}},
  {id:'q_win25',    cat:'grundlagen', label:'Gewinne insgesamt 25 Spiele',                        stat:'win25',         target:25,  reward:{keys:5,      label:'5 🔑'}},
  {id:'q_roch10',   cat:'grundlagen', label:'Rochiere 10-mal insgesamt',                          stat:'castle10',      target:10,  reward:{keys:2,      label:'2 🔑'}},
  {id:'q_streak3',  cat:'grundlagen', label:'Gewinne 3 Spiele in Serie',                         stat:'winStreak3',    target:3,   reward:{keys:3,      label:'3 🔑'}},
  {id:'q_streak5',  cat:'grundlagen', label:'Gewinne 5 Spiele in Serie',                         stat:'winStreak5',    target:5,   reward:{keys:6,      label:'6 🔑'}},
  {id:'q_matt5',    cat:'grundlagen', label:'Gewinne 5 Spiele durch Schachmatt',                 stat:'matts',         target:5,   reward:{keys:4,      label:'4 🔑'}},
  {id:'q_morefig',  cat:'grundlagen', label:'Gewinne mit mehr Figuren als der Gegner',           stat:'winMorePieces', target:3,   reward:{keys:2,      label:'2 🔑'}},
  {id:'q_cap3pawn', cat:'grundlagen', label:'Schlage 3 Bauern in einem einzigen Spiel',          stat:'cap3PawnGame',  target:1,   reward:{coins:800,   label:'+800 💰'}},

  // ── RANG 1 ──────────────────────────────────────────────────
  {id:'q_r1win',    cat:'rang1', label:'Gewinne ein Spiel mit reinem Rang-1 Team',   stat:'winsRank1Only', target:1,  reward:{keys:5,  coins:2000, label:'5 🔑 +2.000 💰'}},
  {id:'q_r1ab5',    cat:'rang1', label:'Nutze 5 Rang-1 Fähigkeiten',                stat:'abilityRank1',  target:5,  reward:{keys:4,  coins:1500, label:'4 🔑 +1.500 💰'}},
  {id:'q_r1win3',   cat:'rang1', label:'Gewinne 3 Spiele mit ≥3 Rang-1 Figuren',    stat:'winsRank1x3',   target:3,  reward:{keys:8,  coins:3000, label:'8 🔑 +3.000 💰'}},

  // ── RANG 2 ──────────────────────────────────────────────────
  {id:'q_r2win',    cat:'rang2', label:'Gewinne ein Spiel mit reinem Rang-2 Team',   stat:'winsRank2Only', target:1,  reward:{keys:10, coins:4000, label:'10 🔑 +4.000 💰'}},
  {id:'q_r2ab10',   cat:'rang2', label:'Nutze 10 Rang-2 Fähigkeiten',               stat:'abilityRank2',  target:10, reward:{keys:8,  coins:3000, label:'8 🔑 +3.000 💰'}},
  {id:'q_r2win2fig',cat:'rang2', label:'Gewinne mit ≥2 Rang-2 Figuren übrig',       stat:'winsRank2Left', target:1,  reward:{keys:10, coins:4000, label:'10 🔑 +4.000 💰'}},

  // ── RANG 3 ──────────────────────────────────────────────────
  {id:'q_r3win',    cat:'rang3', label:'Gewinne ein Spiel mit reinem Rang-3 Team',   stat:'winsRank3Only', target:1,  reward:{keys:18, coins:6000, label:'18 🔑 +6.000 💰'}},
  {id:'q_r3ab15',   cat:'rang3', label:'Nutze 15 Rang-3 Fähigkeiten',               stat:'abilityRank3',  target:15, reward:{keys:15, coins:5000, label:'15 🔑 +5.000 💰'}},
  {id:'q_r3variety',cat:'rang3', label:'Gewinne mit 3 verschiedenen Rang-3 Fähigkeiten',stat:'winsRank3Variety',target:1,reward:{keys:20,coins:7000,label:'20 🔑 +7.000 💰'}},

  // ── RANG 4 ──────────────────────────────────────────────────
  {id:'q_r4only',   cat:'rang4', label:'Gewinne ein Spiel mit reinem Rang-4 Team',   stat:'winsRank4Only', target:1,  reward:{keys:30, coins:10000,label:'30 🔑 +10.000 💰'}},
  {id:'q_r4win2',   cat:'rang4', label:'Gewinne mit ≥2 Rang-4 Figuren auf Brett',   stat:'winsRank4x2',   target:1,  reward:{keys:25, coins:8000, label:'25 🔑 +8.000 💰'}},
  {id:'q_r4ab20',   cat:'rang4', label:'Nutze 20 Rang-4 Fähigkeiten insgesamt',     stat:'abilityRank4',  target:20, reward:{keys:22, coins:7000, label:'22 🔑 +7.000 💰'}},
  {id:'q_r4win5',   cat:'rang4', label:'Gewinne 5 Spiele mit einer Rang-4 Figur',   stat:'winsWithRank4', target:5,  reward:{keys:35, coins:12000,label:'35 🔑 +12.000 💰'}},

  // ── RANG 5 ──────────────────────────────────────────────────
  {id:'q_r5only',   cat:'rang5', label:'Gewinne ein Spiel mit reinem Rang-5 Team',   stat:'winsRank5Only', target:1,  reward:{keys:60, coins:20000,label:'60 🔑 +20.000 💰'}},
  {id:'q_r5last',   cat:'rang5', label:'Gewinne mit einer Rang-5 Figur als letzte',  stat:'winsRank5Last', target:1,  reward:{keys:50, coins:15000,label:'50 🔑 +15.000 💰'}},
  {id:'q_r5ab10',   cat:'rang5', label:'Nutze 10 Rang-5 Fähigkeiten',               stat:'abilityRank5',  target:10, reward:{keys:45, coins:14000,label:'45 🔑 +14.000 💰'}},
  {id:'q_r5matt',   cat:'rang5', label:'Gewinne ein Spiel mit Rang-5 Schachmatt',   stat:'winsRank5Matt', target:1,  reward:{keys:60, coins:20000,label:'60 🔑 +20.000 💰'}},
  {id:'q_r5noab',   cat:'rang5', label:'Gewinne 100 Partien ohne Fähigkeiten zu nutzen', stat:'winsNoAbility', target:100, reward:{keys:55, coins:18000,label:'55 🔑 +18.000 💰'}},

  // ── LEGENDE ─────────────────────────────────────────────────
  {id:'q_leg_win1',    cat:'legende', label:'Gewinne dein erstes Spiel als Legende',             stat:'totalWins',      target:1,   reward:{keys:100, coins:50000,  label:'100 🔑 +50.000 💰'}},
  {id:'q_leg_win10',   cat:'legende', label:'Gewinne 10 Spiele als Legende',                     stat:'totalWins',      target:10,  reward:{keys:200, coins:100000, label:'200 🔑 +100.000 💰'}},
  {id:'q_leg_win50',   cat:'legende', label:'Gewinne 50 Spiele als Legende',                     stat:'totalWins',      target:50,  reward:{keys:500, coins:300000, label:'500 🔑 +300.000 💰'}},
  {id:'q_leg_streak',  cat:'legende', label:'Erreiche eine Siegesserie von 10',                  stat:'maxWinStreak',   target:10,  reward:{keys:150, coins:75000,  label:'150 🔑 +75.000 💰'}},
  {id:'q_leg_streak20',cat:'legende', label:'Erreiche eine Siegesserie von 20',                  stat:'maxWinStreak',   target:20,  reward:{keys:300, coins:150000, label:'300 🔑 +150.000 💰'}},
  {id:'q_leg_matt',    cat:'legende', label:'Gewinne 5 Spiele durch Schachmatt als Legende',     stat:'winsbyMatt',     target:5,   reward:{keys:120, coins:60000,  label:'120 🔑 +60.000 💰'}},
  {id:'q_leg_r5full',  cat:'legende', label:'Stelle ein komplettes Rang-5 Team auf',             stat:'winsRank5Only',  target:3,   reward:{keys:250, coins:125000, label:'250 🔑 +125.000 💰'}},
  {id:'q_leg_allskins',cat:'legende', label:'Schalte alle Brett-Skins frei',                     stat:'boardSkinsOwned',target:9,   reward:{keys:200, coins:100000, label:'200 🔑 +100.000 💰'}},
  {id:'q_leg_ab100',   cat:'legende', label:'Nutze 100 Fähigkeiten als Legende',                 stat:'totalAbilities', target:100, reward:{keys:180, coins:90000,  label:'180 🔑 +90.000 💰'}},
  {id:'q_leg_perfect', cat:'legende', label:'Gewinne ein Spiel ohne eine Figur zu verlieren',    stat:'winsNoPieceLost',target:1,   reward:{keys:300, coins:200000, label:'300 🔑 +200.000 💰'}},
];

// Quest stats live on G.questStats
// Quest completion on G.questDone (set of ids)

function initQuestStats(){
  if(!G.questStats)G.questStats={
    wins:0, fights:0, checks:0, captures:0, matts:0, castles:0,
    capturedRooks:0, capturedQueens:0, promotions:0, maxWinStreak:0,
    winMorePieces:0, endWith3Pieces:0, cap3PawnGame:0,
    pawnReached:0, cap25:0, cap50:0, win10:0, win25:0, check50:0,
    castle10:0, promo3:0, promo5:0, winStreak3:0, winStreak5:0,
    winsRank1Only:0, abilityRank1:0, winsRank1x3:0,
    winsRank2Only:0, abilityRank2:0, winsRank2Left:0,
    winsRank3Only:0, abilityRank3:0, winsRank3Variety:0,
    winsRank4x2:0,   abilityRank4:0, winsWithRank4:0,
    winsRank5Last:0, abilityRank5:0, winsRank5Matt:0, winsNoAbility:0, winsRank4Only:0, winsRank5Only:0,
  };
  if(!G.questDone)G.questDone={};
}

function getQuestProgress(q){
  initQuestStats();
  return Math.min(G.questStats[q.stat]||0, q.target);
}

function isQuestDone(q){return !!G.questDone[q.id];}
function isQuestClaimable(q){return !isQuestDone(q)&&getQuestProgress(q)>=q.target;}

function claimQuest(id){
  const quest=QUESTS.find(q=>q.id===id);if(!quest)return;
  if(!isQuestClaimable(quest))return;
  G.questDone[id]=true;
  if(quest.reward.keys){if(!G.coins)G.coins=0;G.coins+=quest.reward.keys*50;}
  if(quest.reward.coins){if(!G.coins)G.coins=0;G.coins+=quest.reward.coins;}
  save();
  renderQuestScreen();
  updateTopBar();
  // Brief flash
  const btn=document.getElementById('qbtn_'+id);
  if(btn){btn.textContent='✓ Erhalten!';btn.style.background='#1a4a1a';}
}

let activeQuestCat='anfaenger';

function renderQuestScreen(){
  initQuestStats();
  // Tabs
  const tabs=q('#quest-tabs');
  if(tabs){
    tabs.innerHTML='';
    QUEST_CATEGORIES.forEach(cat=>{
      const locked=!!(cat.unlockRank&&G.rankIdx<cat.unlockRank);
      const total=QUESTS.filter(q=>q.cat===cat.id).length;
      const done=QUESTS.filter(q=>q.cat===cat.id&&isQuestDone(q)).length;
      const active=activeQuestCat===cat.id;
      const btn=document.createElement('button');
      btn.style.cssText='padding:5px 10px;border-radius:16px;border:2px solid '+(active?cat.color:locked?'#3a1a3a':'#5a41b0')+';'+
        'background:'+(active?'#1a0d00':locked?'#0d000d':'#1a0f3a')+';color:'+(active?cat.color:locked?'#7a2a7a':'#555')+
        ';font-size:.58rem;font-weight:bold;cursor:'+(locked?'default':'pointer')+';letter-spacing:.5px;opacity:'+(locked?'0.65':'1')+';';
      btn.textContent=(locked?'🔒 ':'')+cat.label+(locked?'':' ('+done+'/'+total+')');
      if(!locked)btn.onclick=()=>{activeQuestCat=cat.id;renderQuestScreen();};
      tabs.appendChild(btn);
    });
  }
  // List
  const list=q('#quest-list');if(!list)return;
  list.innerHTML='';
  const cat=QUEST_CATEGORIES.find(c=>c.id===activeQuestCat);
  QUESTS.filter(q=>q.cat===activeQuestCat).forEach(quest=>{
    const done=isQuestDone(quest);
    const claimable=isQuestClaimable(quest);
    const prog=getQuestProgress(quest);
    const pct=Math.round((prog/quest.target)*100);
    const card=document.createElement('div');
    card.style.cssText='border:1px solid '+(done?'#1a3a1a':claimable?cat.color:'#2a1a5a')+
      ';border-radius:10px;padding:10px 12px;background:'+(done?'#060e06':claimable?'#1a0f3a':'#1a0f3a')+
      ';opacity:'+(done?'.5':'1')+';';
    card.innerHTML=
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">'+
        '<div style="flex:1">'+
          '<div style="font-size:.72rem;color:'+(done?'#3a6a3a':claimable?cat.color:'#ffd45a')+';font-weight:bold;margin-bottom:3px">'+
            (done?'✓ ':'')+quest.label+
          '</div>'+
          '<div style="background:#1a0f3a;border-radius:4px;height:5px;overflow:hidden;margin-bottom:3px">'+
            '<div style="height:100%;width:'+pct+'%;background:'+(done?'#2a5a2a':cat.color)+';border-radius:4px;transition:width .3s"></div>'+
          '</div>'+
          '<div style="font-size:.55rem;color:#555">'+prog+' / '+quest.target+(done?' ✓':'')+'</div>'+
        '</div>'+
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;min-width:60px">'+
          '<div style="font-size:.6rem;color:#ffd45a">'+quest.reward.label+'</div>'+
          (done?'<span style="font-size:.6rem;color:#3a6a3a">Erhalten</span>':
           claimable?'<button id="qbtn_'+quest.id+'" onclick="claimQuest(\''+quest.id+'\')" style="padding:5px 10px;border-radius:6px;border:1px solid '+cat.color+';background:#1a0f3a;color:'+cat.color+';font-size:.6rem;cursor:pointer;font-weight:bold">Abholen!</button>':
           '')+
        '</div>'+
      '</div>';
    list.appendChild(card);
  });
}

// ---- Quest Tracking Hooks ----
// Called after each game event. Integrated into existing game flow.

function trackQuestStat(stat, amount){
  initQuestStats();
  if(G.questStats[stat]!==undefined)G.questStats[stat]+=amount;
  // Check for new claimable quests
  const newlyClaimable=QUESTS.filter(q=>!isQuestDone(q)&&isQuestClaimable(q));
  if(newlyClaimable.length>0&&currentScreen==='quests')renderQuestScreen();
  // Show badge on nav
  renderQuestBadge();
}

function renderQuestBadge(){
  // Badge entfernt — keine rote Zahl auf dem Quest-Button
  const navBtns=document.querySelectorAll('.nav-btn');
  const questNav=navBtns[2];
  if(!questNav)return;
  const badge=questNav.querySelector('.q-badge');
  if(badge)badge.remove();
}

// Called at end of game to track all end-of-game stats
function trackEndOfGame(won, byMatt){
  initQuestStats();
  // count own pieces on board
  let ownPieces=0, ownPieceRanks=[];
  let lastOwnPiece=null;
  let rank4count=0, rank5count=0;
  const abilitiesUsed={}; // abilityId -> rankIdx

  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=chess.board[r][c];
    if(p&&p.col==='w'){
      ownPieces++;
      // rankIdx direkt von der Figur lesen (gesetzt beim Brett-Aufbau)
      const ri=p.rankIdx??0;
      ownPieceRanks.push(ri);
      const group=PIECE_TYPE_TO_GROUP[p.t];
      lastOwnPiece={group,ri};
      if(ri===3)rank4count++;
      if(ri===4)rank5count++;
    }
  }
  if(won){
    trackQuestStat('wins',1);
    if(byMatt)trackQuestStat('matts',1);
    // Kumulative Siege
    G.questStats.win10=G.questStats.wins;
    G.questStats.win25=G.questStats.wins;
    // Siegesserie
    G.questStats.winStreak3=Math.max(G.questStats.winStreak3||0,G.winStreak);
    G.questStats.winStreak5=Math.max(G.questStats.winStreak5||0,G.winStreak);
    // Count enemy pieces
    let enemyPieces=0;
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(chess.board[r][c]?.col==='b')enemyPieces++;
    if(ownPieces>enemyPieces)trackQuestStat('winMorePieces',1);
    if(ownPieces>=3)trackQuestStat('endWith3Pieces',1);
    // Max win streak
    if(G.winStreak>G.questStats.maxWinStreak)G.questStats.maxWinStreak=G.winStreak;
    // Rank-based wins
    const allRank1=ownPieceRanks.every(r=>r===0);
    const allRank2=ownPieceRanks.every(r=>r===1);
    const allRank3=ownPieceRanks.every(r=>r===2);
    const allRank4=ownPieceRanks.every(r=>r===3);
    const allRank5=ownPieceRanks.every(r=>r===4);
    if(allRank1)trackQuestStat('winsRank1Only',1);
    if(ownPieceRanks.filter(r=>r===0).length>=3)trackQuestStat('winsRank1x3',1);
    if(allRank2)trackQuestStat('winsRank2Only',1);
    if(ownPieceRanks.filter(r=>r===1).length>=2)trackQuestStat('winsRank2Left',1);
    if(allRank3)trackQuestStat('winsRank3Only',1);
    if(allRank4)trackQuestStat('winsRank4Only',1);
    if(allRank5)trackQuestStat('winsRank5Only',1);
    if(rank4count>=2)trackQuestStat('winsRank4x2',1);
    if(rank4count>=1)trackQuestStat('winsWithRank4',1);
    if(rank5count>=1&&lastOwnPiece?.ri===4&&byMatt)trackQuestStat('winsRank5Matt',1);
    if(rank5count>=1&&lastOwnPiece?.ri===4)trackQuestStat('winsRank5Last',1);
    if(!chess.abilityUsedThisGame)trackQuestStat('winsNoAbility',1);
  }
  save();
  renderQuestBadge();
}


// ============================================================
// NAVIGATION (Spiele Modal)
// ============================================================

function showChessSpieleModal(){
  const modal=document.getElementById('chessSpielModal');
  if(modal)modal.style.display='flex';
}

function closeChessSpieleModal(){
  const modal=document.getElementById('chessSpielModal');
  if(modal)modal.style.display='none';
}

function openRealm(){
  closeChessSpieleModal();
  window.location.href='/chess-world/index.html';
}

function openRoulette(){
  closeChessSpieleModal();
  window.location.href='/';
}
