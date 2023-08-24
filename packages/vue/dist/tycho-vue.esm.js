function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
const EMPTY_OBJ = {};
function isObject(value) {
    return value != null && typeof value === 'object';
}
function isString(value) {
    return typeof value === 'string';
}
function hasChanged(val, newVal) {
    return !Object.is(val, newVal);
}
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, l) => (l ? l.toUpperCase() : ''));
};
const toHandlerKey = (str) => {
    return str ? 'on' + capitalize(str) : '';
};
const isArray = Array.isArray;

function createDep(dep) {
    return new Set(dep);
}

let shouldTrack;
let activeEffect;
class ReactiveEffect {
    constructor(fn, scheduler) {
        /** 避免重复调用 stop 多次触发 cleanupEffect */
        this.active = true;
        /**
         * 所有包含当前 Effect 实例的集合
         * 用于调用 stop 时, 追踪收集的依赖, 执行清空依赖逻辑
         */
        this.deps = [];
        this.parent = void 0;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        if (!this.active) {
            return this._fn();
        }
        cleanupEffect(this);
        let preShouldTrack = shouldTrack;
        shouldTrack = true;
        this.parent = activeEffect;
        activeEffect = this;
        const result = this._fn();
        activeEffect = this.parent;
        this.parent = void 0;
        shouldTrack = preShouldTrack;
        return result;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => dep.delete(effect));
    // 清空集合, 优化内存
    effect.deps.length = 0;
}
/**
 * 使用 WeakMap 代替 map
 * WeakMap 只能使用 object 作为 key 值
 * 并且 object 没有引用时可以被垃圾回收
 * WeakMap 不能被迭代
 */
const targetMap = new WeakMap();
/**
 * @method 依赖收集
 */
function track(target, key) {
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    // 避免 deps 重复收集
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
/**
 * @method 依赖更新
 */
function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (depsMap) {
        const dep = depsMap.get(key);
        triggerEffects(dep);
    }
}
function triggerEffects(dep) {
    /**
     * 遍历 dep 过程中, 触发 effect.run() 会导致 dep 变化 (清空依赖, 收集依赖 死循环)
     * 所以需要创建一个新的 Set, 用于 trigger dep 中的 effect
     */
    const effectsToRun = createDep(dep);
    for (const effect of effectsToRun) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function effect(fn, option = {}) {
    const _effect = new ReactiveEffect(fn, option.scheduler);
    extend(_effect, option);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}

class ComputedRefImpl {
    constructor(getter) {
        this._dirty = true;
        this._getter = getter;
        this._effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true;
            }
        });
    }
    get value() {
        if (this._dirty) {
            this._dirty = false;
            this._value = this._effect.run();
        }
        return this._value;
    }
}
function computed(getter) {
    return new ComputedRefImpl(getter);
}

// 抽离, 仅在初始化时调用一次
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const arrayInstrumentations = /*#__PURE__*/ createArrayInstrumentations();
function createArrayInstrumentations() {
    const instrumentations = {};
    // instrument identity-sensitive Array methods to account for possible reactive
    // values
    ['includes', 'indexOf', 'lastIndexOf'].forEach((key) => {
        instrumentations[key] = function (...args) {
            const arr = toRaw(this);
            // we run the method using the original args first (which may be reactive)
            const res = arr[key](...args);
            if (res === -1 || res === false) {
                // if that didn't work, run it again using raw values.
                return arr[key](...args.map(toRaw));
            }
            else {
                return res;
            }
        };
    });
    return instrumentations;
}
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
        if (key === "__v_raw" /* ReactiveFlags.RAW */) {
            return target;
        }
        else if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        const targetIsArray = isArray(target);
        if (!isReadonly) {
            if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
                return Reflect.get(arrayInstrumentations, key, receiver);
            }
        }
        const _target = Reflect.get(target, key);
        if (shallow) {
            return _target;
        }
        // 嵌套对象 proxy 代理
        if (isObject(_target)) {
            return isReadonly ? readonly(_target) : reactive(_target);
        }
        // 依赖收集
        if (!isReadonly) {
            track(target, key);
        }
        return _target;
    };
}
function createSetter() {
    return function (target, key, value) {
        const _target = Reflect.set(target, key, value);
        // 依赖更新
        trigger(target, key);
        return _target;
    };
}
const mutableHandlers = { get, set };
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key) {
        console.warn(`key: ${key} set 失败, target 为 readonly: `, target);
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

const reactiveMap = new WeakMap();
const readonlyMap = new WeakMap();
const shallowReadonlyMap = new WeakMap();
function reactive(target) {
    // if trying to observe a readonly proxy, return the readonly version.
    if (isReadonly(target))
        return target;
    if (isReactive(target))
        return target;
    return createActiveObject(target, mutableHandlers, reactiveMap);
}
function readonly(target) {
    if (isReadonly(target))
        return target;
    return createActiveObject(target, readonlyHandlers, readonlyMap);
}
function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandlers, shallowReadonlyMap);
}
function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}
function isReactive(value) {
    return !!value["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */];
}
function isReadonly(value) {
    return !!value["__v_isReadonly" /* ReactiveFlags.IS_READONLY */];
}
function createActiveObject(raw, baseHandlers, proxyMap) {
    if (!isObject(raw)) {
        console.warn(`target ${raw} should be object or array`);
        return raw;
    }
    if (proxyMap.has(raw))
        return proxyMap.get(raw);
    const proxy = new Proxy(raw, baseHandlers);
    proxyMap.set(raw, proxy);
    return proxy;
}
function toRaw(observed) {
    const raw = observed && observed["__v_raw" /* ReactiveFlags.RAW */];
    return raw ? toRaw(raw) : observed;
}

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        this.dep = new Set();
        this.update(value);
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        if (hasChanged(this._rawValue, newValue)) {
            this.update(newValue);
            triggerEffects(this.dep);
        }
    }
    update(value) {
        this._rawValue = value;
        this._value = convert(value);
    }
}
/**
 * 嵌套对象代理
 */
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function isRef(ref) {
    return !!(ref === null || ref === void 0 ? void 0 : ref.__v_isRef);
}
/**
 * @method 解包 Refs
 */
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function ref(value) {
    return new RefImpl(value);
}
const shallowUnwrapHandlers = {
    get: (target, key, receiver) => unRef(Reflect.get(target, key, receiver)),
    set: (target, key, value, receiver) => {
        const oldValue = target[key];
        if (isRef(oldValue) && !isRef(value)) {
            oldValue.value = value;
            return true;
        }
        else {
            return Reflect.set(target, key, value, receiver);
        }
    },
};
/**
 * @description 代理对象, 使 render 函数中可以直接访问 setup 返回值解包后的结果
 */
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, shallowUnwrapHandlers);
}
function toRefs(target) {
    if (!isReactive(target)) {
        console.warn(`toRefs() expects a reactive object`);
        return target;
    }
    const res = {};
    for (const key in target) {
        res[key] = propertyToRef(target, key);
    }
    return res;
}
function toRef(target, key) {
    return propertyToRef(target, key);
}
function propertyToRef(target, key) {
    const val = target[key];
    return isRef(val) ? val : new ObjectRefImpl(target, key);
}
class ObjectRefImpl {
    constructor(target, key) {
        this.target = target;
        this.key = key;
        this.__v_isRef = true;
    }
    get value() {
        return this.target[this.key];
    }
    set value(newValue) {
        this.target[this.key] = newValue;
    }
}

/**
 * @description vnode 的类型, 渲染使用组件时注入的插槽
 */
const FRAGMENT = Symbol('FRAGMENT');
/**
 * @description vnode 的类型, 渲染文本 textNode
 */
const CREATE_TEXT = Symbol('CREATE_TEXT');
function createVNode(type, props, children) {
    const vnode = {
        el: null,
        shapeFlag: getShapeFlag(type),
        props,
        type,
        children,
        key: props === null || props === void 0 ? void 0 : props.key,
    };
    if (typeof children === 'string') {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === 'object') {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOTS_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVNode(text) {
    return createVNode(CREATE_TEXT, {}, text);
}
function getShapeFlag(type) {
    return typeof type === 'string'
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === 'function') {
            return createVNode(FRAGMENT, {}, slot(props));
        }
    }
}

function emit(instance, event, ...args) {
    const { props } = instance;
    const handler = props[toHandlerKey(camelize(event))];
    handler && handler(...args);
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props,
};
const PublicInstanceHandlers = {
    get({ instance }, key) {
        const { setupState, props } = instance;
        if (key in setupState) {
            return setupState[key];
        }
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

/**
 * @description initProps 的作用是初始化组件的 props
 */
function initProps(instance, rawProps = {}) {
    instance.props = rawProps;
    // todo: attrs
}

/**
 * @description initSlot 的作用是初始化组件 instance.slots
 */
function initSlot(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOTS_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    // 支持具名插槽
    for (const key in children) {
        const slot = children[key];
        // 支持作用域插槽
        const vnode = (props) => normalizeSlotValue(slot(props));
        slots[key] = vnode;
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode, parent = null) {
    const componentInstance = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        parent,
        provides: (parent === null || parent === void 0 ? void 0 : parent.provides) || {},
        emit: () => { },
        isMounted: false,
        next: null,
        update: null,
    };
    componentInstance.emit = emit.bind(null, componentInstance);
    return componentInstance;
}
/**
 * @description setupComponent 的作用是初始化组件的 props、slots、attrs、setupState 等
 */
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    initSlot(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
/**
 * @description setupStatefulComponent 的作用是初始化组件的 setupState
 */
function setupStatefulComponent(instance) {
    const { type, props } = instance;
    const Component = type;
    // 代理对象
    // 使 render 函数中可以直接通过 this 访问公共属性和 setUp 返回的值
    instance.proxy = new Proxy({ instance }, PublicInstanceHandlers);
    const { setup } = Component;
    if (setup) {
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
/**
 * @description handleSetupResult 的作用是处理 setup 函数的返回值
 */
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === 'object') {
        instance.setupState = proxyRefs(setupResult);
    }
    // todo if setupResult is function
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (compiler && !Component.render) {
        if (Component.template) {
            Component.render = compiler(Component.template);
        }
    }
    instance.render = Component.render;
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
// 抽离 set 方法, 便于断点调试
const setCurrentInstance = (instance) => {
    currentInstance = instance;
};
let compiler;
function registerRuntimeComplier(_compiler) {
    compiler = _compiler;
}

function provide(key, value) {
    const instance = getCurrentInstance();
    if (instance) {
        const { parent } = instance;
        // 当前组件首次调用 provide 时 (instance.provides === parent?.provides)，
        // 初始化 provides
        if (instance.provides === (parent === null || parent === void 0 ? void 0 : parent.provides)) {
            instance.provides = Object.create(parent.provides);
        }
        instance.provides[key] = value;
    }
}
/**
 * @description inject 的作用是获取父组件提供的数据
 */
function inject(key, defaultValue) {
    const instance = getCurrentInstance();
    if (instance === null || instance === void 0 ? void 0 : instance.parent) {
        const value = instance.parent.provides[key];
        if (!value) {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

function shouldUpdateComponent(preVnode, vnode) {
    const { props: preProps = {} } = preVnode;
    const { props = {} } = vnode;
    for (const key in props) {
        if (preProps[key] !== props[key]) {
            return true;
        }
    }
    return false;
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

let p = Promise.resolve();
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
const queue = [];
function queueJobs(job) {
    if (queue.includes(job))
        return;
    queue.push(job);
    queueFlush();
}
let isFlushPending = false;
function queueFlush() {
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    let job;
    while ((job = queue.shift()))
        job();
    isFlushPending = false;
}

function createRenderer(options) {
    const { insert: _insert, patchProp: _patchProp, createElement: _createElement, unmount: _unmount, setElementTExt: _setElementTExt, } = options;
    return {
        createApp: createAppAPI(render),
    };
    /**
     * @description render 函数的作用是将 vnode 渲染到 container 中
     */
    function render(vnode, container) {
        patch(null, vnode, container, null, null);
    }
    function isComponent(vnode) {
        const { shapeFlag } = vnode;
        return Boolean(shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */);
    }
    /**
     * @description
     *
     * patch 的作用是根据 vnode 的类型，调用不同的处理函数
     * 递归处理 vnode, 直到 vnode 的类型是 element, 最后挂载到 container 中
     */
    function patch(preVnode, vnode, container, parentComponent, anchor) {
        const { type, shapeFlag } = vnode;
        switch (type) {
            case FRAGMENT:
                processFragment(preVnode, vnode, container, parentComponent, anchor);
                break;
            case CREATE_TEXT:
                processText(preVnode, vnode, container);
                break;
            default:
                // element
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(preVnode, vnode, container, parentComponent, anchor);
                }
                // 传入的是一个组件
                else if (isComponent(vnode)) {
                    processComponent(preVnode, vnode, container, parentComponent, anchor);
                }
                break;
        }
    }
    function processText(preVnode, vnode, container) {
        const { children } = vnode;
        const textNode = document.createTextNode(children);
        vnode.el = textNode;
        container.append(textNode);
    }
    function processFragment(preVnode, vnode, container, parentComponent, anchor) {
        mountChildren(vnode.children, container, parentComponent, anchor);
    }
    /**
     * @description 处理 element
     */
    function processElement(preVnode, vnode, container, parentComponent, anchor) {
        if (preVnode) {
            patchElement(preVnode, vnode, parentComponent, anchor);
        }
        else {
            mountElement(vnode, container, parentComponent, anchor);
        }
    }
    function patchElement(preVnode, vnode, parentComponent, anchor) {
        const { props: preProps = EMPTY_OBJ } = preVnode;
        const { props: currProps = EMPTY_OBJ } = vnode;
        const el = (vnode.el = preVnode.el);
        patchProps(preProps, currProps, el);
        patchChildren(preVnode, vnode, el, parentComponent, anchor);
    }
    function patchChildren(preVnode, vnode, container, parentComponent, anchor) {
        const { shapeFlag, children } = vnode;
        const { shapeFlag: preShapeFlag, children: preChildren } = preVnode;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // array to text
            if (preShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                unmountChildren(preChildren);
            }
            // text to text
            if (children !== preChildren) {
                _setElementTExt(container, children);
            }
        }
        else {
            // text to array
            if (preShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                _setElementTExt(container, '');
                mountChildren(children, container, parentComponent, anchor);
            }
            // array to array
            else {
                patchKeyedChildren(preChildren, children, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(preChildren, children, container, parentComponent, parentAnchor = null) {
        var _a;
        let i = 0;
        let e1 = preChildren.length - 1;
        let e2 = children.length - 1;
        const end = () => Math.min(e1, e2);
        // 1. sync from start
        while (i <= end()) {
            const n1 = preChildren[i];
            const n2 = children[i];
            if (!isSameVnodeType(n1, n2))
                break;
            patch(n1, n2, container, parentComponent, parentAnchor);
            i++;
        }
        // 2. sync from end
        while (i <= end()) {
            const n1 = preChildren[e1];
            const n2 = children[e2];
            if (!isSameVnodeType(n1, n2))
                break;
            patch(n1, n2, container, parentComponent, parentAnchor);
            e1--;
            e2--;
        }
        /**
         * 3. common sequence + mount
         *
         * - inset in the end
         * (a b)
         * (a b) c
         *
         * - inset in the start
         * (a b)
         * c (a b)
         */
        if (i > e1 && i <= e2) {
            const anchor = e2 + 1 < children.length ? children[e2 + 1].el : null;
            while (i <= e2) {
                patch(null, children[i], container, parentComponent, anchor);
                i++;
            }
        }
        else if (i > e2) {
            /**
             * 4. common sequence + unmount
             *
             * - remove from the end
             * (a b) c
             * (a b)
             *
             * - remove from the start
             * c (a b)
             * (a b)
             */
            while (i <= e1) {
                _unmount(preChildren[i].el);
                i++;
            }
        }
        else {
            /**
             * 5. unknown sequence
             * matching nodes & remove nodes that are no longer present
             */
            let s1 = i;
            let s2 = i;
            let patched = 0;
            const toBePatched = e2 - i + 1;
            const keyToNewIndexMap = new Map();
            /**
             * 0 for node to be mounted
             */
            const newIndexToOldIndexMap = new Array(toBePatched).fill(0);
            /**
             * true: node has been moved
             */
            let moved = false;
            let preNewIndex = 0;
            for (let i = s2; i <= e2; i++) {
                keyToNewIndexMap.set(children[i].key, i);
            }
            for (let i = s1; i <= e1; i++) {
                const preVNode = preChildren[i];
                if (patched > toBePatched) {
                    _unmount(preVNode.el);
                    continue;
                }
                let newIndex;
                if (preVNode.key != null) {
                    newIndex = keyToNewIndexMap.get(preVNode.key);
                }
                else {
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVnodeType(preVNode, children[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                // no matching node
                if (newIndex === undefined) {
                    _unmount(preVNode.el);
                }
                else {
                    if (newIndex >= preNewIndex) {
                        preNewIndex = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    patch(preVNode, children[newIndex], container, parentComponent, parentAnchor);
                    patched++;
                }
            }
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : [];
            // looping backwards so that we can use last patched node as anchor
            for (let i = toBePatched - 1, j = increasingNewIndexSequence.length - 1; i >= 0; i--) {
                const childIndex = i + s2;
                const el = children[childIndex].el;
                const anchor = (_a = children[childIndex + 1]) === null || _a === void 0 ? void 0 : _a.el;
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, children[childIndex], container, parentComponent, anchor);
                }
                else if (moved) {
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        _insert(el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
        function isSameVnodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
    }
    function unmountChildren(children) {
        for (const item of children) {
            _unmount(item.el);
        }
    }
    function patchProps(preProps, currProps, el) {
        if (preProps !== currProps) {
            for (const key in currProps) {
                const preVal = preProps[key];
                const currVal = currProps[key];
                if (preVal !== currVal) {
                    _patchProp(el, key, preVal, currVal);
                }
            }
            if (preProps !== EMPTY_OBJ) {
                for (const key in preProps) {
                    if (!(key in currProps)) {
                        _patchProp(el, key, preProps[key], null);
                    }
                }
            }
        }
    }
    function mountElement(vnode, container, parentComponent, parentAnchor = null) {
        const el = _createElement(vnode.type);
        vnode.el = el;
        const { children, props, shapeFlag } = vnode;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode.children, el, parentComponent, parentAnchor);
        }
        // props
        for (const key in props) {
            const val = props[key];
            _patchProp(el, key, null, val);
        }
        _insert(el, container, parentAnchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    /**
     * @description 处理组件
     */
    function processComponent(preVnode, vnode, container, parentComponents, anchor) {
        if (preVnode) {
            updateComponent(preVnode, vnode);
        }
        else {
            mountComponent(vnode, container, parentComponents, anchor);
        }
    }
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    /**
     * @description 更新组件
     * 重新调用 render 对比新旧 vnode, 更新组件
     */
    function updateComponent(preVnode, vnode) {
        const instance = (vnode.component = preVnode.component);
        if (shouldUpdateComponent(preVnode, vnode)) {
            instance.next = vnode;
            instance.update();
        }
        else {
            vnode.el = preVnode.el;
            instance.vnode = vnode;
        }
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        instance.update = effect(() => {
            const { proxy } = instance;
            if (!instance.isMounted) {
                instance.subTree = instance.render.call(proxy, proxy);
                // 递归处理 subTree
                patch(null, instance.subTree, container, instance, anchor);
                // el 一定存在: 递归处理 subTree 时，会将 subTree.el 赋值
                // 最后一个根节点一定是 Element, 否则就无限循环了
                initialVNode.el = instance.subTree.el;
                instance.isMounted = true;
                return;
            }
            const { next, vnode, subTree: preSubTree } = instance;
            if (next) {
                next.el = vnode.el;
                updateComponentPreRender(instance, next);
            }
            instance.subTree = instance.render.call(proxy, proxy);
            patch(preSubTree, instance.subTree, container, instance, anchor);
        }, {
            scheduler() {
                queueJobs(instance.update);
            },
        });
        /**
         * 更新组件 instance 的属性 vnode, props
         */
        function updateComponentPreRender(instance, nextVNode) {
            instance.next = null;
            instance.vnode = nextVNode;
            instance.props = nextVNode.props || {};
        }
    }
}
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, preVal, val) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        el.addEventListener(getEventName(key), val);
    }
    else {
        if (val == null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, val);
        }
    }
}
function getEventName(key) {
    return key.slice(2).toLowerCase();
}
/**
 * move or insert element before anchor
 */
function insert(el, container, anchor) {
    container.insertBefore(el, anchor || null);
}
function unmount(el) {
    const parent = el.parentElement;
    if (parent) {
        parent.removeChild(el);
    }
}
function setElementTExt(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    insert,
    patchProp,
    createElement,
    unmount,
    setElementTExt,
});
function createApp(args) {
    return renderer.createApp(args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    h: h,
    renderSlots: renderSlots,
    createTextVNode: createTextVNode,
    createElementVNode: createVNode,
    getCurrentInstance: getCurrentInstance,
    registerRuntimeComplier: registerRuntimeComplier,
    provide: provide,
    inject: inject,
    createRenderer: createRenderer,
    nextTick: nextTick,
    toDisplayString: toDisplayString,
    computed: computed,
    isRef: isRef,
    unRef: unRef,
    ref: ref,
    proxyRefs: proxyRefs,
    toRef: toRef,
    toRefs: toRefs,
    reactive: reactive,
    readonly: readonly,
    shallowReadonly: shallowReadonly,
    isProxy: isProxy,
    isReactive: isReactive,
    isReadonly: isReadonly,
    toRaw: toRaw,
    effect: effect
});

const TO_DISPLAY_STRING = Symbol('toDisplayString');
const CREATE_ELEMENT_VNODE = Symbol('createElementVNode');
const helperMapName = {
    [TO_DISPLAY_STRING]: 'toDisplayString',
    [CREATE_ELEMENT_VNODE]: 'createElementVNode',
};

function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
    const functionName = 'render';
    const args = ['_ctx', '_cache'];
    const signature = args.join(', ');
    push(`function ${functionName}(${signature}) {\n`);
    push('\treturn ');
    genNode(ast.codegenNode, context);
    push('\n}');
    return {
        code: context.code,
    };
}
function genFunctionPreamble(ast, context) {
    var _a;
    const { push } = context;
    const VueBinging = 'Vue';
    const aliasHelper = (s) => `${helperMapName[s]}: _${helperMapName[s]}`;
    if ((_a = ast.helpers) === null || _a === void 0 ? void 0 : _a.length) {
        push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging}`);
    }
    push('\n');
    push('return ');
}
function createCodegenContext() {
    const context = {
        code: '',
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        },
    };
    return context;
}
function genNode(node, context) {
    switch (node.type) {
        case 4 /* NodeTypes.TEXT */:
            genText(node, context);
            break;
        case 2 /* NodeTypes.INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 1 /* NodeTypes.SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 3 /* NodeTypes.ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* NodeTypes.COMPOUND_EXPRESSION */:
            genCompoundExpression(node, context);
            break;
    }
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([tag, props, children]), context);
    push(')');
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(', ');
        }
    }
}
function genNullable(args) {
    return args.map((i) => i || 'null');
}
function genCompoundExpression(node, context) {
    const { push } = context;
    const { children } = node;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(')');
}
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}

function baseParse(content) {
    const context = createParserContext(content);
    const root = createRoot(parseChildren(context, []));
    return root;
}
function parseChildren(context, ancestors) {
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        if (context.source.startsWith('{{')) {
            node = parseInterpolation(context);
        }
        else if (context.source.startsWith('<')) {
            if (/[a-zA-Z]/.test(context.source[1]))
                node = parseElement(context, ancestors);
        }
        if (!node)
            node = parseText(context);
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    const s = context.source;
    if (s.startsWith('</')) {
        for (let i = ancestors.length - 1; i > -1; i--) {
            if (startsWithEndTagOpen(s, ancestors[i].tag))
                return true;
        }
    }
    return !s;
}
function parseText(context) {
    const endToken = ['<', '{{'];
    let endIndex = context.source.length;
    for (let i = 0; i < endToken.length; i++) {
        const index = context.source.indexOf(endToken[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    const content = parseTextData(context, endIndex);
    return {
        type: 4 /* NodeTypes.TEXT */,
        content,
    };
}
function parseTextData(context, len) {
    const content = context.source.slice(0, len);
    advanceBy(context, content.length);
    return content;
}
function parseElement(context, ancestors) {
    const element = parseTag(context, 0 /* TagType.Start */);
    ancestors.push(element);
    element.children = parseChildren(context, ancestors);
    ancestors.pop();
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, 1 /* TagType.End */);
    }
    else {
        throw new Error(`Element ${element.tag} is not closed`);
    }
    return element;
}
function startsWithEndTagOpen(source, tag) {
    return (source.startsWith('</') &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag);
}
function parseTag(context, type) {
    const match = /^<\/?([ a-zA-Z ]*)/.exec(context.source);
    const tag = match[1];
    advanceBy(context, match[0].length);
    advanceBy(context, 1);
    if (type === 1 /* TagType.End */)
        return;
    return {
        type: 3 /* NodeTypes.ELEMENT */,
        tag,
        children: [],
    };
}
function parseInterpolation(context) {
    const openDelimiter = '{{';
    const closeDelimiter = '}}';
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    advanceBy(context, openDelimiter.length);
    const rawContentLen = closeIndex - openDelimiter.length;
    const rawContent = parseTextData(context, rawContentLen);
    const content = rawContent.trim();
    advanceBy(context, closeDelimiter.length);
    return {
        type: 2 /* NodeTypes.INTERPOLATION */,
        content: {
            type: 1 /* NodeTypes.SIMPLE_EXPRESSION */,
            content,
        },
    };
}
function advanceBy(context, len) {
    context.source = context.source.slice(len);
}
function createRoot(children) {
    return {
        type: 0 /* NodeTypes.ROOT */,
        children,
    };
}
function createParserContext(content) {
    return {
        source: content,
    };
}

function transform(root, options) {
    const context = createTransformContext(root, options);
    traverseNode(root, context);
    createRootCodegen(root);
    root.helpers = Array.from(context.helpers);
}
function createRootCodegen(root) {
    const child = root.children[0];
    if (child.type === 3 /* NodeTypes.ELEMENT */) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = child;
    }
}
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Set(),
        helper(name) {
            context.helpers.add(name);
            return name;
        },
    };
    return context;
}
function traverseNode(node, context) {
    const { nodeTransforms = [] } = context;
    const exitFns = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context);
        if (onExit)
            exitFns.push(onExit);
    }
    switch (node.type) {
        case 2 /* NodeTypes.INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 0 /* NodeTypes.ROOT */:
        case 3 /* NodeTypes.ELEMENT */:
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    while (i--)
        exitFns[i]();
}
function traverseChildren(parent, context) {
    const children = parent.children;
    if (isArray(children)) {
        for (let i = 0; i < children.length; i++) {
            const childNode = children[i];
            traverseNode(childNode, context);
        }
    }
}

function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type: 3 /* NodeTypes.ELEMENT */,
        tag: `"${tag}"`,
        props: props,
        children: children,
    };
}

const transformElement = (node, context) => {
    if (node.type === 3 /* NodeTypes.ELEMENT */) {
        return () => {
            const { tag: vnodeTag, children } = node;
            let vnodeProps;
            let vnodeChildren = children[0];
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
};

const transformExpression = (node, context) => {
    if (node.type === 2 /* NodeTypes.INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
};
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

function isText(node) {
    return node.type === 2 /* NodeTypes.INTERPOLATION */ || node.type === 4 /* NodeTypes.TEXT */;
}

const transformText = (node, context) => {
    if (node.type === 3 /* NodeTypes.ELEMENT */) {
        return () => {
            const { children } = node;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5 /* NodeTypes.COMPOUND_EXPRESSION */,
                                    children: [child],
                                };
                            }
                            currentContainer.children.push(` + `);
                            currentContainer.children.push(next);
                            children.splice(j--, 1);
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
};

function baseCompile(template) {
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });
    return generate(ast);
}

function compileToFunction(template) {
    const { code } = baseCompile(template);
    const render = new Function('Vue', code)(runtimeDom);
    return render;
}
registerRuntimeComplier(compileToFunction);

export { computed, createApp, createVNode as createElementVNode, createRenderer, createTextVNode, effect, getCurrentInstance, h, inject, isProxy, isReactive, isReadonly, isRef, nextTick, provide, proxyRefs, reactive, readonly, ref, registerRuntimeComplier, renderSlots, shallowReadonly, toDisplayString, toRaw, toRef, toRefs, unRef };
