<template>
  <div class="hello">
    <h1>{{ movect }} {{ hint }}</h1>
    <table>
      <tr>
        <td >
          <div>
            HeadStart
            <multiselect v-model="headStart" :options="headStartOpts"></multiselect>
          </div>
        </td>
      <tr>
      <tr>
        <td style="padding: 20px">
          <table>
            <tr v-for="r in sRange" >
              <td v-for="c in sRange" v-on:mouseover="showDistMap(r,c)" v-on:click="doClick(r,c)":style="{'background-color':getColor(human,r,c),'width':'20px'}"> 
                {{getCell(human,r,c)}}
              </td>
            </tr>
          </table>
        </td>
        <td style="padding: 20px">
          <table>
            <tr v-for="r in sRange" >
              <td v-for="c in sRange" :style="{'background-color':getColor(comp,r,c),'width':'20px'}"> 
                {{getCell(comp,r,c)}}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</template>

<script>
// splice
const TinyQueue=require('tinyqueue')
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
    let q=new TinyQueue.default([{fs,moves:[],est:20,cm:colorDist(fs)}],(a,b)=>(a.moves.length+a.est)-(b.moves.length+b.est))
    let startDist=colorDist(fs,distMap(fs)).reduce((a,c)=>a+=c,0)
    let visited={}
    let best=[]
    const meval=300
    let evals=meval
    while (q.length>0) {
       let b=q.pop()
       if ((best.length==0) || ((b.moves.length+Math.max(...b.cm,b.cm.filter(a=>a>0).length))<(best.length))) {
           for (let m of moves(b.fs)) {
              let fs=fill(b.fs,m)
              if (done(fs)) {
                 best= [...b.moves,m]
                 console.log('best ',best.length,evals)
                 evals=300
                 continue
              }
              let cs=Object.keys(fs.guts).join(',')
              let cm=colorDist(fs,distMap(fs))
              if (!visited[cs]) {
                 evals-=1
                 if ((best.length>0)&&(evals<0))
                    return best
                 visited[cs]=true
                 q.push( {
                    fs,
                    // add a bonus for closing out a color
                    est:((20*cm.reduce((a,c)=>a+=c,0))/startDist)-(cm.filter(c=>c==0).length*3),
                    moves:[...b.moves,m],
                    cm
                 } )
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


// end splice

import Multiselect from 'vue-multiselect'


export default {
  name: 'HelloWorld',
  components: { Multiselect },
  data () {
    return {
      msg: 'flood',
      sRange,
      human: {},
      comp: {} ,
      movect: 0,
      dmap:{},
      hint:'',
      headStart:3,
      headStartOpts:range(6),
      solution:[]
    }
  },
  methods: {
    getCell: function (grid,r,c)  {
      if (!grid || !grid.guts) return '_'
      let loc=[r,c]
      if (this.dmap[loc] && grid==this.human) return this.dmap[loc].toString()
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
      return grid.guts[loc]?'White':ret[grid.brd[loc]]
    },
    doClick(r,c) {
      let loc=[r,c]
      if (this.human.skin[loc]) {
        this.human=fill(this.human,this.human.brd[loc])
        this.dmap={}
        this.hint=''
        let compmove=this.movect-3//-this.headStart
        if (compmove>=0 && compmove<this.solution.length) {
           this.comp=fill(this.comp,this.solution[compmove])
        }
        this.movect++
      }
    },
    showDistMap(r,c) {
      let loc=[r,c]
      if (this.human.skin) {
        if (this.human.skin[loc]) {
          let tb=fill(this.human,this.human.brd[loc])
          this.dmap=distMap(tb)
          let cd=colorDist(tb,this.dmap)
          //this.hint=')'+cd.join('+')+'='+cd.reduce((a,c)=>a+c,0)
          this.hint=''
        } else {
          this.dmap={}
          this.hint=''
        }
      }
    }
  },
  mounted() {
    let rb=rBoard()
    this.comp=initFloodState(rb)
    this.human=initFloodState(rb)
    this.solution=solve(this.comp)
    this.movect=0
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
