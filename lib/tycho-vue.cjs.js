'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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

const extend = Object.assign;
const EMPTY_OBJ = {};
function isObject(value) {
    return value != null && typeof value === 'object';
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
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        if (!this.active) {
            return this._fn();
        }
        shouldTrack = true;
        activeEffect = this;
        const result = this._fn();
        shouldTrack = false;
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
    const dep = depsMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    // todo: 当没依赖收集时 dep 有可能不存在
    if (dep) {
        for (const effect of dep) {
            if (effect.scheduler) {
                effect.scheduler();
            }
            else {
                effect.run();
            }
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

// 抽离, 仅在初始化时调用一次
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        // 用于内部判断对象是否被代理
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
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

function reactive(target) {
    // if trying to observe a readonly proxy, return the readonly version.
    if (isReadonly(target))
        return target;
    if (isReactive(target))
        return target;
    return createActiveObject(target, mutableHandlers);
}
function readonly(target) {
    if (isReadonly(target))
        return target;
    return createActiveObject(target, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandlers);
}
function isReactive(value) {
    return !!value["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */];
}
function isReadonly(value) {
    return !!value["__v_isReadonly" /* ReactiveFlags.IS_READONLY */];
}
function createActiveObject(raw, baseHandler) {
    if (!isObject(raw)) {
        console.warn(`target ${raw} 必须是一个对象`);
        return raw;
    }
    return new Proxy(raw, baseHandler);
}

class RefImpl {
    constructor(value) {
        this.dep = new Set();
        this.__v_isRef = true;
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
 *
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

function emit(instance, event, ...args) {
    const { props } = instance;
    const handler = props[toHandlerKey(camelize(event))];
    handler && handler(...args);
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
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
                if (newIndex === undefined) {
                    _unmount(preVNode.el);
                }
                else {
                    patch(preVNode, children[newIndex], container, parentComponent, parentAnchor);
                    patched++;
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
        mountComponent(vnode, container, parentComponents, anchor);
    }
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        const instance = createComponentInstance(initialVNode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        effect(() => {
            if (instance.isMounted) {
                const { proxy } = instance;
                const preSubTree = instance.subTree;
                const subTree = (instance.subTree = instance.render.call(proxy));
                patch(preSubTree, subTree, container, instance, anchor);
            }
            else {
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy));
                // 递归处理 subTree
                patch(null, subTree, container, instance, anchor);
                // el 一定存在: 递归处理 subTree 时，会将 subTree.el 赋值 (最后一个根节点一定是 Element, 否则就无限循环了)
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
        });
        /**
         * todo:
         * 支持在组件的 props 上传入事件监听, 在 el 上挂载 instance.props 上监听的事件
         * 目前只支持监听组件的 emit 事件
         */
    }
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

exports.computed = computed;
exports.createApp = createApp;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.isRef = isRef;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.renderSlots = renderSlots;
exports.unRef = unRef;
