'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const extend = Object.assign;
function isObject(value) {
    return value != null && typeof value === 'object';
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

/**
 * 使用 WeakMap 代替 map
 * WeakMap 只能使用 object 作为 key 值
 * 并且 object 没有引用时可以被垃圾回收
 * WeakMap 不能被迭代
 */
const targetMap = new WeakMap();
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

function createComponentInstance(vnode) {
    const componentInstance = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        emit: () => { },
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
        const setupResult = setup(shallowReadonly(props), {
            emit: instance.emit,
        });
        handleSetupResult(instance, setupResult);
    }
}
/**
 * @description handleSetupResult 的作用是处理 setup 函数的返回值
 */
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === 'object') {
        instance.setupState = setupResult;
    }
    // todo if setupResult is function
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    instance.render = Component.render;
}

/**
 * @description render 函数的作用是将 vnode 渲染到 container 中
 */
function render(vnode, container) {
    path(vnode, container);
}
function isComponent(vnode) {
    const { shapeFlag } = vnode;
    return Boolean(shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */);
}
/**
 * @description
 *
 * path 的作用是根据 vnode 的类型，调用不同的处理函数
 * 递归处理 vnode, 直到 vnode 的类型是 element, 最后挂载到 container 中
 */
function path(vnode, container) {
    const { shapeFlag } = vnode;
    // vnode.type 是一个字符串，说明是一个 element
    if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
        processElement(vnode, container);
    }
    // 传入的是一个组件
    else if (isComponent(vnode)) {
        processComponent(vnode, container);
    }
    // 非法传入暂不处理
}
/**
 * @description 处理 element
 */
function processElement(vnode, container) {
    mountElement(vnode, container);
    // todo: update
}
function mountElement(vnode, container) {
    const el = (vnode.el = document.createElement(vnode.type));
    const { children, props, shapeFlag } = vnode;
    if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
        mountChildren(vnode, el);
    }
    // props
    for (const key in props) {
        const val = props[key];
        const isOn = (key) => /^on[A-Z]/.test(key);
        if (isOn(key)) {
            el.addEventListener(getEventName(key), val);
        }
        else {
            el.setAttribute(key, val);
        }
    }
    container.append(el);
}
function getEventName(key) {
    return key.slice(2).toLowerCase();
}
function mountChildren(vnode, container) {
    const children = vnode.children;
    children.forEach((v) => {
        path(v, container);
    });
}
/**
 * @description 处理组件
 */
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function mountComponent(initialVNode, container) {
    const instance = createComponentInstance(initialVNode);
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance, initialVNode, container) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    // 递归处理 subTree
    path(subTree, container);
    // el 一定存在: 递归处理 subTree 时，会将 subTree.el 赋值 (最后一个根节点一定是 Element, 否则就无限循环了)
    initialVNode.el = subTree.el;
    /**
     * todo:
     * 支持在组件的 props 上传入事件监听, 在 el 上挂载 instance.props 上监听的事件
     * 目前只支持监听组件的 emit 事件
     */
}

function createVNode(type, props, children) {
    const vnode = {
        el: null,
        shapeFlag: getShapeFlag(type),
        props,
        type,
        children,
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
function getShapeFlag(type) {
    return typeof type === 'string'
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            const vnode = createVNode(rootComponent);
            render(vnode, rootContainer);
        },
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

// 作用域插槽: 15.40
function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === 'function') {
            return createVNode('div', {}, slot(props));
        }
    }
}

exports.createApp = createApp;
exports.h = h;
exports.renderSlots = renderSlots;
