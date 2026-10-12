"use strict";
/* Schach-Regelwerk und Bot (aus Chess World uebernommen, ohne RPG-Teile). */
const chess = { pawnStrike: false }; // Fantasy-Faehigkeiten gibt es hier nicht
const CHESS_SYMS = {
  wK:'\u2654',wQ:'\u2655',wR:'\u2656',wB:'\u2657',wN:'\u2658',wP:'\u2659',
  bK:'\u265A',bQ:'\u265B',bR:'\u265C',bB:'\u265D',bN:'\u265E',bP:'\u265F'
};
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

function cloneBoard(b){ return b.map(r=>r.slice()); } // Figuren-Objekte werden nie veraendert, nur ersetzt
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

// Schnelle Angriffspruefung (direkt ueber Strahlen/Spruenge statt alle Zuege zu erzeugen).
function sqAttacked(board,row,col,byColor){
  const pr=byColor==='w'?row+1:row-1; // Zeile, aus der ein Bauer der Farbe angreift
  for(const dc of [-1,1]){
    if(inB(pr,col+dc)){const p=board[pr][col+dc];if(p&&p.col===byColor&&p.t==='P')return true;}
  }
  for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){
    const r=row+dr,c=col+dc;
    if(inB(r,c)){const p=board[r][c];if(p&&p.col===byColor&&p.t==='N')return true;}
  }
  for(const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){
    const r=row+dr,c=col+dc;
    if(inB(r,c)){const p=board[r][c];if(p&&p.col===byColor&&p.t==='K')return true;}
  }
  for(const [dr,dc,diag] of [[-1,-1,1],[-1,1,1],[1,-1,1],[1,1,1],[-1,0,0],[1,0,0],[0,-1,0],[0,1,0]]){
    let r=row+dr,c=col+dc;
    while(inB(r,c)){
      const p=board[r][c];
      if(p){
        if(p.col===byColor&&(p.t==='Q'||(diag?p.t==='B':p.t==='R')))return true;
        break;
      }
      r+=dr;c+=dc;
    }
  }
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
    if(isInCheck(board,color))return isMax?-30000-depth:30000+depth; // schnelleres Matt zaehlt mehr
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

// Bot-Staerke wird von der Seite gesetzt (Level 1-4).
let AI_LEVEL = { depth: 2, jitter: 60, blunderChance: 0.10 };
function getAIDifficulty(){ return AI_LEVEL; }

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

