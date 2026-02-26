class Target {
  private count = 0
  increment() {
    return ++this.count
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

class ManualWrapper {
  constructor(private t: Target) {}
  increment() {
    return this.t.increment()
  }
}
const wrapper = new ManualWrapper(target)

console.time('proxy1')
for (let i = 0; i < 1000000; i++) proxy1.increment()
console.timeEnd('proxy1')

console.time('manual')
for (let i = 0; i < 1000000; i++) wrapper.increment()
console.timeEnd('manual')
