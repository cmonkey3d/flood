<template>
  <div class="hello">
    <h1>Flood!</h1>
    <h2><input type="button" value="<" @click="decmove"/> {{ movect }} <input type="button" value=">" @click="incmove"/> </h2>
    <div>
       <input type="button" value="About" @click="toggleAbout" />
       <div v-if="aboutActive" style="text-align: left;">
         <p>
           This game is based on the <a target="_blank" rel="noopener noreferrer" href="https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/flood.html">flood</a> game from Simon Tatham's portable puzzle collection.<br/><br/>
           The game is kind of addictive but I am not very good at it.  I wrote this version with more help available in a vain attempt to get better at the game. <br/><br/>
           The object of the game is to clear the grid on the left before the computer can clear the grid on the right. On each turn you can click any of the colored blocks adjacent to a blank block.  All of the blocks of that color that are connected to a blank block will then turn blank.  (Click around a little bit and it will make sense.)<br/><br/>
           At the begining of a new game you may select how much of a head start you have on the computer (if any).<br/><br/>
           If the distmap checkbox is checked the number of moves to blank out each block if that move is made is displayed. <br/><br/>
           If the totals checkbox is checked the maximum distmap for each color is displayed and totaled (in theory the smaller the total the better. This number is used as a heuristic for the computer player.)<br/><br/>
           The < and > buttons on either side of the move count allow you to review the moves played by both you and the computer.<br/><br/>
         </p>
       </div>
    </div>
    <table>
      <tr>
        <td >
          <div v-if="human.length==1">
            HeadStart
            <multiselect v-model="headStart" :options="headStartOpts"></multiselect>
          </div>
          <div v-else-if="gameOver()">
            <input type="button" value="PlayAgain" @click="playAgain" />
          </div>
          <div v-else>
            {{hint}}
          </div>
        </td>
        <td>
          DistMap:<input type="checkbox" v-model="distMapEnb"> Totals:<input type="checkbox" v-model="totEnb">
        </td>
      <tr>
      <tr>
        <td style="padding: 20px">
          <table>
            <tr v-for="r in sRange" >
              <td v-for="c in sRange" v-on:mouseover="showDistMap(r,c)" v-on:click="doClick(r,c)":style="{'background-color':getColor(curHuman(),r,c),'width':'20px'}"> 
                {{getCell(curHuman(),r,c)}}
              </td>
            </tr>
          </table>
        </td>
        <td style="padding: 20px">
          <table>
            <tr v-for="r in sRange" >
              <td v-for="c in sRange" :style="{'background-color':getColor(curComp(),r,c),'width':'20px'}"> 
                {{getCell(curComp(),r,c)}}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</template>

<script>
import slsl from './slsl.js'
const range=(n,spread=a=>a)=>[...Array(n).keys()].map(spread)
const side=12
const sRange=range(side)
const corners=[[-1,-1],[side,side],[-1,side],[side,-1]]
const outside=sRange.reduce((a,c)=>[...a,[c,-1],[c,side],[-1,c],[side,c]],corners)
const inside=sRange.reduce((a,c)=>[...a,...sRange.map(d=>[c,d])],[])
const colors=['r','o','y','g','b','p']
const rndEl=e=>e[Math.trunc(Math.random()*e.length)]
const rBoard = ()=>outside.reduce((a,c)=>{a[c]='x';return a},inside.reduce((a,c)=>{a[c]=rndEl(colors);return a;},{}))
const boardRow=(b,r)=>sRange.map(c=>b.guts[[c,r]]?'.':b.brd[[c,r]]).join('')
const done=b=>inside.every(a=>b.guts[a])
const boardStr=b=>sRange.map(r=>boardRow(b,r)).join('\n')
const dirs=[[1,0],[-1,0],[0,1],[0,-1]]
const start=[0,0]
const obAdd=(o,k,v=true)=>{ o[k]=v; return o;}
const obSub=(o,k)=>{ delete o[k]; return o;}


function flood(b,x,y) {
    let inset={}
    let outset={}
    let clr=b.brd[[x,y]]
    function inFlood(x,y) {
       let loc=[x,y]
       if (inset[loc] || b.guts[loc] || outset[loc]) return
       if (b.brd[loc]!=clr) {
          outset[loc]=true
          return
       } 
       inset[loc]=true
       for (let d of dirs) inFlood(x+d[0],y+d[1])
    }
    inFlood(x,y)
    return {
       guts:Object.keys(inset),
       skin:Object.keys(outset)
    }
}

function initFloodState(brd) {
    let ret = {
        brd,
        cons:{},
        guts:outside.reduce((a,c)=>obAdd(a,c),{}),
        skin:{}
    }
    for (let l of inside) {
       if (!ret.cons[l]) {
          let c=flood(ret,l[0],l[1])
          ret.cons=c.guts.reduce((a,l)=>obAdd(a,l,c),ret.cons)
       }
    }
    ret.skin=ret.cons[start].skin.reduce((a,l)=>obAdd(a,l),ret.skin)
    ret.guts=ret.cons[start].guts.reduce((a,l)=>obAdd(a,l),ret.guts)
    return ret
}

const moves=fs=>Object.keys(Object.keys(fs.skin).reduce((a,c)=>obAdd(a,fs.brd[c]),{}))

function fill(fs,clr) {
    let nfs={
        brd:fs.brd,
        cons:fs.cons,
        skin:{...fs.skin},
        guts:{...fs.guts}
    }
    for (let loc of Object.keys(fs.skin).filter(l=>fs.brd[l]==clr)) {
       if (!nfs.guts[loc]) {
          nfs.guts=nfs.cons[loc].guts.reduce((a,c)=>obAdd(a,c),nfs.guts)
          nfs.skin=nfs.cons[loc].guts.reduce((a,c)=>obSub(a,c),nfs.skin)
          nfs.skin=nfs.cons[loc].skin.reduce((a,c)=>nfs.guts[c]?a:obAdd(a,c),nfs.skin)
       }
    }
    return nfs
}

function distMap(brd) {
    let map={}
    let skin=Object.keys(brd.skin)
    let ct=0;
    while (skin.length>0) {
        let nextSkin={}
        ct+=1
        for (let loc of skin) {
           if (!map[loc] && !brd.guts[loc]) {
               map=brd.cons[loc].guts.reduce((a,c)=>obAdd(a,c,ct),map)
               nextSkin=brd.cons[loc].skin.reduce((a,c)=>(brd.guts[c] || map[c])?a:obAdd(a,c),nextSkin)
           }
        }
        skin=Object.keys(nextSkin)
    }
    return map
}

const colorDist=(b,dm=distMap(b))=>colors.map(c=>inside.filter(i=>!b.guts[i] && b.brd[i]==c).reduce((a,c)=>dm[c]>a?dm[c]:a,0))

function solve(fs) {
    const est=t=>t.moves.length+t.est
    const possible=b=> ((b.moves.length+b.cm.filter(a=>a>0).length+Math.min(...b.cm.filter(a=>a>0))-1)<best.length)

    let idct=0
    let q=slsl((a,b)=>[est(a)-est(b),Object.keys(b.fs.skin).length-Object.keys(a.fs.skin).length,a.moves.length-b.moves.length,a.id-b.id].find(d=>d!=0))
    q.push({fs,moves:[],est:20,cm:colorDist(fs),id:++idct})
    let startDist=colorDist(fs,distMap(fs)).reduce((a,c)=>a+=c,0)
    let visited={}
    let best=[]
    let ctdown=500
    while (q.length>0) {
       let b=q.pop()
       if ((best.length==0) || possible(b)) {
           for (let m of moves(b.fs)) {
              let fs=fill(b.fs,m)
              if (done(fs)) {
                 best= [...b.moves,m]
                 console.log('best ',best.length,Object.keys(visited).length)
                 continue
              }
              let cs=Object.keys(fs.guts).join(',')
              let cm=colorDist(fs,distMap(fs))
              if (!visited[cs]) {
                 if ((best.length>0)&&(--ctdown<0))
                    return best
                 visited[cs]=true
                 let n ={
                    fs,
                    est:((20*cm.reduce((a,c)=>a+=c,0))/startDist)+(cm.filter(c=>c>0).length),
                    moves:[...b.moves,m],
                    cm,
                    id:++idct
                 } 
                 if (best.length==0 || possible(n))
                    q.push(n)
            }
          } 
        }
    }
    console.log('evaluated ',Object.keys(visited).length,best.length)
    return best
}

const disp2=(h,c)=> sRange.map(r=>boardRow(h,r)+'|-|-|'+boardRow(c,r)).join('\n')

function clear(b) {
   let m=distMap(b)
   return colors.filter(c=>Object.keys(m).filter(l=>b.brd[l]==c)
                    .reduce((a,l)=>a>m[l]?a:m[l],0)==1)
}


import Multiselect from 'vue-multiselect'


export default {
  name: 'HelloWorld',
  components: { Multiselect },
  data () {
    return {
      msg: 'flood',
      sRange,
      human: [],
      comp: [] ,
      movect: 0,
      dmap:{},
      hint:'',
      headStart:3,
      headStartOpts:range(6),
      solution:[],
      distMapEnb:false,
      totEnb:false,
      aboutActive:false
    }
  },
  methods: {
    curHuman: function() { return this.human[this.movect]},
    gameOver: function() {return this.human.length>0?done(this.curHuman()):false},
    compMove: function() {
        let compmove=this.movect-this.headStart
        return Math.max(compmove,0)
    },
    curComp: function() { return this.comp[this.compMove()]},
    getCell: function (grid,r,c)  {
      if (!grid || !grid.guts) return '_'
      let loc=[r,c]
      if (this.dmap[loc] && grid==this.curHuman()) return this.dmap[loc].toString(16)
      return grid.guts[loc]?'_':grid.brd[loc]
    },
    getColor: function (grid,r,c) {
      if (!grid || !grid.guts) return 'White'
      let loc=[r,c]
      const ret={'r':'DeepPink',
                 'o':'LightSalmon',
                 'y':'yellow',
                 'g':'SpringGreen',
                 'b':'SlateBlue',
                 'p':'Plum',
                 }
      //return grid.guts[loc]?ret[grid.lastColor]:ret[grid.brd[loc]]
      return grid.guts[loc]?'White':ret[grid.brd[loc]]
    },
    fillPlus(grid,color) {
      let ret=fill(grid,color)
      ret.lastColor=color
      return ret
    },
    incmove() {
      if (this.movect<this.human.length-1) this.movect++
    },
    decmove() {
      if (this.movect>0) this.movect--
    },
    validClickBoard() {
      return this.movect==this.human.length
    },
    doClick(r,c) {
      let loc=[r,c]
      if (this.movect+1<this.human.length) return
      if (this.curHuman().skin[loc]) {
        //this.human=this.fillPlus(this.human,this.human.brd[loc])
        this.human.push(this.fillPlus(this.curHuman(),this.curHuman().brd[loc]))
        this.dmap={}
        this.hint=''
        let compmove=this.movect-this.headStart
        if (compmove>=0 && compmove<this.solution.length) {
           this.comp.push(this.fillPlus(this.curComp(),this.solution[compmove]))
        }
        this.movect++
      }
    },
    showDistMap(r,c) {
      let loc=[r,c]
      if (this.curHuman().skin) {
        if (this.curHuman().skin[loc]) {
          let tb=fill(this.curHuman(),this.curHuman().brd[loc])
          if (this.distMapEnb) {
            this.dmap=distMap(tb)
          }
          let cd=colorDist(tb,this.dmap)
          if (this.totEnb) {
            this.hint=cd.join('+')+'='+cd.reduce((a,c)=>a+c,0)
          } else {
            this.hint=''
          }
        } else {
          this.dmap={}
          this.hint=''
        }
      }
    },
    playAgain() {
      this.movect=0
      this.human=[]
      this.comp=[]
      let rb=rBoard()
      this.comp.push(initFloodState(rb))
      this.human.push(initFloodState(rb))
      this.solution=solve(this.curComp())
    },
    toggleAbout() {this.aboutActive=!this.aboutActive}
  },
  mounted() {
    this.playAgain()
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>
<style scoped>
h1, h2 {
  font-weight: normal;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}

</style>
