// Simple Little Skip List
function slsl(cmpFn=(a,b)=>a-b) {
   let rtNode=[]
   rtNode.push(rtNode)
   let getbits=()=>Math.trunc(Math.random()*(1<<21))+(1<<22)
   let bits=getbits()
   let len=0
   function newNode(el) {
      let ht=1
      while (ht<=rtNode.length) {
         let stop=bits&3
         if ((bits>>=2)==1) bits=getbits()
         if (stop!=0) break
         ht+=1
      }
      if (ht>rtNode.length) rtNode.push(rtNode)
      let ret= Array(ht)
      ret.pay=el
      return ret
   }
   function find(el) {
      let upd=Array(rtNode.length)
      let ht=rtNode.length-1
      let cn=rtNode
      while (ht>=0) {
         if ((cn[ht]===rtNode)||(cmpFn(el,cn[ht].pay)<=0)) {
            upd[ht]=cn
            ht--
         }
         else
            cn=cn[ht]
      }
      return upd
   }
   return {
      push(el) {
         // insert el in order
         let nn=newNode(el)
         let upd=find(el)
         if (upd[0][0]!==rtNode && cmpFn(el,upd[0][0].pay)==0) return this
         for (let h=nn.length-1;h>=0;h--) {
            let t=upd[h][h]
            upd[h][h]=nn
            nn[h]=t
         }
         len++
         return this
      },
      pop() {
         // remove the first element
         let ret=rtNode[0]
         if (ret!==rtNode)
            len--
         for (let h=ret.length-1;h>=0;h--)
            rtNode[h]=ret[h]
         return ret.pay
      },
      del(el) {
         // delete the given element
         let upd=find(el)
         let delNode=upd[0][0]
         if (cmpFn(el,delNode.pay)==0) {
            for (let i=0;i<delNode.length;i++)
               upd[i][i]=delNode[i]
            len--
            return true
         }
         return false
      },
      has(el) {
         // return element if exists, false if not
         let f=find(el)[0][0]
         return cmpFn(el,f.pay)==0?f.pay:false
      },
      get length() { 
         return len
      },
      *[Symbol.iterator]() {
         let cn=rtNode[0] 
         while (cn!==rtNode) {
            yield cn.pay
            cn=cn[0]
         }
      }
   }
}

//module.exports = slsl
export default slsl
