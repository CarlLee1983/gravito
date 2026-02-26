class Target {
  private count = 0
  increment() {
    this.count++
    return this.count
  }
}
const target = new Target()
const proxy1 = new Proxy(target, {
  get(t, prop, receiver) {
    const val = Reflect.get(t, prop, receiver)
    if (typeof val === 'function') return val.bind(t)
    return val
  },
})
const proxy2 = new Proxy(target, {
  get(t, prop, receiver) {
    return Reflect.get(t, prop, receiver)
  },
})

console.time('proxy1 with bind')
for (let i = 0; i < 1000000; i++) proxy1.increment()
console.timeEnd('proxy1 with bind')

console.time('proxy2 without bind')
for (let i = 0; i < 1000000; i++) proxy2.increment()
console.timeEnd('proxy2 without bind')
