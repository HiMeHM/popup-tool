﻿let currentVideoElement = null
let currentContainer = null
let videoHeight = -1
let videoWidth = -1
let isPopup = false


const MIN_VALID_WIDTH = 100
const MIN_VALID_HEIGHT = 100

class Toolbar {
    constructor() {

        this.toolbar = document.createElement('div')
        this.toolbar.id = 'popup-tool'

        const html = `
        <div ><button id='x-popup' type='button'>${browser.i18n.getMessage('toolbar_popup')}</button></div>
        <div style='display:none;'><button id='x-restore' type='button'>${browser.i18n.getMessage('toolbar_restore')}</button></div>
        <div style='display:none;'><button id='x-remember-location' type='button'>${browser.i18n.getMessage('toolbar_remember')}</button></div>
    `
        const doc = (new DOMParser).parseFromString(html, "text/html");
        while (doc.body.firstElementChild instanceof HTMLElement) {
            this.toolbar.appendChild(doc.body.firstElementChild);
        }

        this.toolbar.querySelectorAll('div').forEach(node => {
            node.addEventListener('click', this.onClick.bind(this))
        })
    }
    display(locator) {
        // try {
        //     if (!locator) throw new Error(locator)
        // } catch (e) {
        //     console.error(e)
        // }
        const rect = locator.getBoundingClientRect()
        this.toolbar.style.left = `${rect.left}px`
        this.toolbar.style.top = `${rect.top}px`
        this.toolbar.style.display = ''
        this.mount()
    }
    hideEl(el) {
        if (el instanceof HTMLElement) {
            el.style.display = 'none'
        }
    }
    showEl(el, x, y) {
        if (el instanceof HTMLElement) {
            el.style.display = 'block'
        }
    }
    showPopupBtn() {
        this.showEl(this.toolbar.querySelector('#x-popup').parentElement)
    }
    hidePopupBtn() {
        this.hideEl(this.toolbar.querySelector('#x-popup').parentElement)
    }
    showRestoreBtn() {
        this.showEl(this.toolbar.querySelector('#x-restore').parentElement)
        this.showEl(this.toolbar.querySelector('#x-remember-location').parentElement)
    }
    hideRestoreBtn() {
        this.hideEl(this.toolbar.querySelector('#x-restore').parentElement)
        this.hideEl(this.toolbar.querySelector('#x-remember-location').parentElement)
    }
    remove() {
        this.toolbar.remove()
    }
    mount() {
        document.body.appendChild(this.toolbar)
    }
    get parentElement() {
        return this.toolbar.parentElement
    }

    async onClick(event) {
        const target = event.target
        // hideOtherElement(currentVideoElement)
        const fixupInstance = extensionRule.getRule().fixup
        if (target.id === 'x-popup') {
            fixupInstance && fixupInstance.beforeCreate(currentContainer, currentVideoElement, callbackForFixup)

            const rect = currentContainer.getBoundingClientRect()
            videoHeight = rect.height
            videoWidth = rect.width
            await browser.runtime.sendMessage({
                command: 'create',
                height: rect.height,
                width: rect.width,
            })
            onCreatePopupWindow()
            fixupInstance && fixupInstance.afterCreate(currentContainer, currentVideoElement, callbackForFixup)
        } else if (target.id === 'x-restore') {
            fixupInstance && fixupInstance.beforeDestory(currentContainer, currentVideoElement, callbackForFixup)
            await browser.runtime.sendMessage({
                command: 'destory',
            })
            afterDestoryPopupWindow()
            fixupInstance && fixupInstance.afterDestory(currentContainer, currentVideoElement, callbackForFixup)
        } else if (target.id === 'x-remember-location') {
            await browser.runtime.sendMessage({
                command: 'rememberLocation'
            })
        }
    }
}

const popupToolBar = new Toolbar()

class Fixup {
    constructor() {}
    matched(container, video, callback) { // 当fixup所在的规则成功匹配后 调用 matched

    }
    beforeCreate(container, video, callback) {
        // throw new Error('This meathod is not implemented')
    }
    afterCreate(container, video) {
        // throw new Error('This meathod is not implemented')
    }
    beforeDestory(container, video) {
        // throw new Error('This meathod is not implemented')
    }
    afterDestory(container, video) {
        // throw new Error('This meathod is not implemented')
    }
    triggerClick(selector) {
        const el = document.querySelector(selector)
        if (!el) {
            console.warn('触发 ' + selector + ' 失败, 没有找到这个元素')
        }
        el && el.click()
    }
    removeScrollbar() {
        const style = document.createElement("style")
        style.id = 'popup-tool-style'
        style.type = "text/css"
        style.textContent = `
        html{
            overflow: hidden !important;
            height: 100% !important;
            width: 100% !important;
        }
        body{
            overflow: hidden !important;
            height: 100% !important;
            width: 100% !important;
        }
    `
        document.head.appendChild(style)
    }
    restoreScrollbar() {
        const el = document.querySelector('#popup-tool-style')
        el && el.remove()
    }
    setFullWindow(arg, includeParent = false) {
        console.log(arg)
        let zIndex = 999999;
        const style = `display:initial;width:100%;height:100%;position:fixed;top:0px;left:0px;z-index:${zIndex};visibility: visible;background-color:black`
        if (typeof arg === 'string') {
            const el = document.querySelector(arg)
            arg = el
            setStyleArrtibute(arg, style)
        } else if (arg instanceof HTMLElement) {
            setStyleArrtibute(arg, style)
        }
        if (arg && includeParent) {
            let p = arg.parentElement
            while (p && p !== document.documentElement) {
                zIndex -= 1
                setStyleArrtibute(p, `z-index:${zIndex}`)
                p = p.parentElement
            }
        }
    }
    unsetFullWindow(arg, includeParent = false) {
        if (typeof arg === 'string') {
            const el = document.querySelector(arg)
            arg = el
            restoreStyleArrtibute(el)
        } else if (arg instanceof HTMLElement) {
            restoreStyleArrtibute(arg)
        }
        if (arg && includeParent) {
            let p = arg.parentElement
            while (p && p !== document.documentElement) {
                restoreStyleArrtibute(p)
                p = p.parentElement
            }
        }
    }
    createStyle(style) {
        const s = document.createElement('style')
        s.textContent = style
        return s
    }
}

const extensionRule = {
    cacheObj: null, // {regexp:/./,selector:'',tagName:[],goodElements:[]} 缓存匹配到的规则
    first: true,
    rules: [

        {
            name: 'youtube',
            test: /https?:\/\/www\.youtube\.com\/watch\?v=.*/,
            selector: '#player-container',
            fixup: new class extends Fixup {
                constructor() {
                    // TODO: 修复youtube 进度条
                    super()
                    this.style = null
                }
                matched() {
                    const bottomControlBar = document.querySelector('.ytp-chrome-bottom')
                    this.style = this.createStyle(`
                        #masthead-container{
                            display: none !important;
                        }
                        #page-manager{
                            padding: 0px !important;
                            margin: 0px !important;
                        }
                        #primary{
                            padding: 0px !important;
                            margin: 0px !important;
                        }
                        #player-theater-container{
                            position: fixed !important;
                            width: 100% !important;
                            height: 100% !important;
                            max-height: unset !important;
                            z-index: 9 !important;
                        }
                        #player{
                            width: 100% !important;
                            height: 100% !important;
                            position: fixed !important;
                            z-index:999  !important;
                        }
                        #player-container-outer{
                            margin: 0px !important;
                            padding: 0px !important;
                            height: 100% !important;
                            width: 100% !important;
                            position: relative !important;
                            max-width: unset !important;
                            min-height: unset !important;
                        }
                        #player-container-inner{
                            height: 100% !important;
                            width: 100% !important;
                            box-sizing: border-box !important;
                            margin: 0px !important;
                            padding: 0px !important;
                        }
                        .html5-video-container{
                            height: 100% !important;
                        }
                        .html5-main-video{
                            width: 100% !important;
                            height: 100% !important;
                        }
                        .ytp-chrome-bottom{
                            /*width: ${100- Math.round((24 / window.innerWidth)*100)}% !important;*/
                            bottom: 1.1% !important;
                        }
                    `)
                    this.style.id = 'youtube-popup-style'
                }
                afterCreate(container, video) {

                    // const progressbar = document.querySelector('.ytp-progress-bar')
                    // const timePercent = parseInt(progressbar.getAttribute('aria-valuenow'))/parseInt(progressbar.getAttribute('aria-valuemax'))

                    // const bottombar = document.querySelector('.ytp-chrome-bottom')
                    // const oldwidth = bottombar.getBoundingClientRect().width

                    document.head.appendChild(this.style)
                    this.removeScrollbar()
                    this.triggerClick('.ytp-size-button')
                    // const newwidth = bottombar.getBoundingClientRect().width
                    // this.setFullWindow(container)
                    // this.setFullWindow(video)
                    // document.querySelector('#masthead-container').style.display = 'none'
                    // this.triggerClick('#ytp-size-button').click()
                }
                afterDestory(container, video) {
                    this.style.remove()
                    this.restoreScrollbar()
                    // this.unsetFullWindow(container)
                    // this.unsetFullWindow(video)
                    // document.querySelector('#masthead-container').style.display = ''
                    // this.triggerClick('#ytp-size-button').click()
                }
            }
        },
        {
            name: 'bilibili',
            test: /^https?:\/\/www\.bilibili\.com\/video\/av\d+/,
            selector: '.player',
            fixup: new class extends Fixup {
                constructor() {
                    super()
                    this.time = 0
                    this.paused = false
                }
                beforeCreate(container, video, callback) {
                    this.time = video.currentTime
                    this.paused = video.paused
                    console.info('记录播放时间', this.time)
                    console.info('正在播放', !this.paused)
                }
                afterCreate(container, video, callback) {
                    setTimeout(() => {
                        const realWindow = window.wrappedJSObject
                        realWindow.GrayManager.reload(realWindow.GrayManager.playerParams)
                    }, 500)
                    setTimeout(() => {
                        // 因为上面代码用GrayManage刷新视频, 导致参数 video 指向已经消失的元素 
                        video = document.querySelector('.player video'); // 重新获取video
                        !this.paused && video.play()
                        video.currentTime = this.time

                        console.info('恢复播放时间', this.time)
                        console.info('设置播放中', !this.paused)
                        callback({
                            currentVideoElement: video
                        })
                    }, 1800)
                    setTimeout(() => {
                        if (document.querySelector(`[data-text="网页全屏"]`)) {
                            this.triggerClick('.bilibili-player-video-web-fullscreen')
                            // this.triggerClick(`[name="web_fullscreen"]`)
                        }
                    }, 2000)
                }
                afterDestory() {
                    this.triggerClick('.bilibili-player-video-web-fullscreen')
                }
            }
        },
        {
            name: 'bilibili_live',
            test: /https?:\/\/live\.bilibili\.com\/\d+/,
            selector: '.player-section',
            fixup: new class extends Fixup {
                constructor() {
                    super()
                }
                matched(container, video, callback) {

                }
                afterCreate() {
                    this.triggerClick('[data-title="网页全屏"]')
                    this.triggerClick('[data-title="重新载入"]')
                }
                afterDestory() {
                    this.triggerClick('[data-title="退出网页全屏"]')
                }
            }
        },
        {
            name: 'bilibili_bangumi',
            test: /https?:\/\/www\.bilibili\.com\/bangumi\/.*/,
            selector: '.player',
            tagName: ['video'],
            fixup: new class extends Fixup {
                constructor() {
                    super()
                    this.rule = /https?:\/\/www\.bilibili\.com\/bangumi\/.*/
                }
                afterCreate() {
                    this.triggerClick(`[name="web_fullscreen"]`)
                }
                afterDestory() {
                    this.triggerClick(`[name="web_fullscreen"]`)
                }
            }
        },
        {
            name: 'tencent_video',
            test: /https?:\/\/v\.qq\.com\/x\/cover\/.*/,
            selector: '#mod_player',
            fixup: new class extends Fixup {
                constructor() {
                    super()
                }
                afterCreate() {
                    this.triggerClick(`[data-report='browser-fullscreen']`)
                }
                afterDestory() {
                    this.triggerClick(`[data-report='browser-fullscreen']`)
                }
            }
        },
        {
            name: 'iqiyi',
            test: /https?:\/\/www\.iqiyi\.com\/v_.*/,
            selector: '.pw-video',
            fixup: new class extends Fixup {
                constructor() {
                    super()
                }
                afterCreate() {
                    this.triggerClick(`[data-player-hook="webfullscreen"]`)
                }
                afterDestory() {
                    this.triggerClick(`[data-player-hook="webfullscreen"]`)
                }
            },
        },
        {
            name: 'youku',
            test: /https?\:\/\/v\.youku\.com\/v_show\/.*/,
            selector: '.playArea',
            fixup: new class extends Fixup {
                constructor() {
                    super()
                    this.style = null
                }
                matched() {
                    this.style = this.createStyle(`
                    #module_basic_player,#player{
                        height: 100% !important;
                    }
                    
                    `)
                }
                afterCreate(container) {
                    this.removeScrollbar()
                    this.setFullWindow(container)
                    document.head.appendChild(this.style)
                }
                afterDestory(container) {
                    this.restoreScrollbar()
                    this.unsetFullWindow(container)
                    this.style.remove()
                }
            }
        },
        {
            name: 'mgtv',
            test: /https?:\/\/www\.mgtv\.com\/b\/\d+\/\d+\.html/,
            fixup: new class extends Fixup {
                constructor() {
                    super()
                }
                afterCreate(container, video) {
                    setTimeout(() => {
                        this.removeScrollbar()
                        setStyleArrtibute(video, `position: fixed;top: 0px; left: 0px; z-index: 9999;`)
                    }, 800)
                }
            }
        },
        {
            name: 'ifeng',
            test: /https?:\/\/v\.ifeng\.com\/video_\d+\.shtml/,
            tagName: ['video'],
            fixup: new class extends Fixup {
                constructor() {
                    super()
                }
                afterCreate(container, video) {
                    this.removeScrollbar()
                    this.setFullWindow('#playerWrap')
                    this.setFullWindow('#playercontainer')
                }
            }
        },
        {
            name: 'douyu',
            selector: '#js-room-video',
            test: function () {
                return /https?:\/\/www\.douyu\.com\/\d+/.test(location.href)
            },
            fixup: new class extends Fixup {
                constructor() {
                    super()
                }
                beforeCreate(_, __, callback) {
                    this.triggerClick('[title="网页全屏"]')
                    callback({
                        currentContainer: document.querySelector('.PlayerCase')
                    })
                }
                afterDestory() {
                    this.triggerClick('[title="退出网页全屏"]')
                }
            }
        },
        {
            name: 'jandan',
            test: function () {
                return false
                // /https?:\/\/jandan\.net\/pic.*/
            },
            selector: '#comments',
            fixup: new class extends Fixup {
                constructor() {
                    super()
                }
                afterCreate(container) {
                    // this.setFullWindow(container)
                }
                afterDestory(container) {
                    // this.setFullWindow(container)
                }
            }
        },
        {
            name: 'DEFAULT',
            test: /./,
            tagName: ['video', 'object', 'embed'],
            fixup: new class extends Fixup {
                constructor() {
                    super()
                    this.controls = false
                }
                afterCreate(container, video) {
                    this.removeScrollbar()
                    this.setFullWindow(video, true)
                    if (video && video.tagName === 'VIDEO') {
                        this.controls = video.controls
                        video.controls = true
                    }
                }
                afterDestory(container, video) {
                    this.unsetFullWindow(video, true)
                    this.restoreScrollbar()
                    video && (video.controls = this.controls)
                }
            },
        }
    ],
    getRule(force = false) {
        // force: 强制重新获取规则
        if (this.first || force) {
            this.first = false
            for (const obj of this.rules) {
                let f = false
                if (obj.test instanceof RegExp && obj.test.test(location.href)) {
                    f = true
                } else if (obj.test instanceof Function && obj.test()) {
                    f = true
                }
                if (f) {
                    this.cacheObj = obj
                    const c = obj.selector ? document.querySelector(obj.selector) : null
                    this.cacheObj.fixup.matched(c, null, callbackForFixup)
                    this.cacheObj.goodElementMapping = new WeakMap() //存放匹配成功的元素， 事件触发的element -> 自己或用selector获取的元素
                    console.info(`'${this.cacheObj.name}' policy is picked`)
                    if (obj.name !== 'DEFAULT') {
                        browser.runtime.sendMessage({
                            command: 'availablePopup'
                        })
                    }
                    break
                }
            }
        }
        return this.cacheObj
    },
    match(target) {
        // console.log(target, 'start matching')
        this.cacheObj = this.getRule()

        const lowerCaseName = target.tagName.toLowerCase()
        if (this.cacheObj.name === 'DEFAULT') {
            //  使用默认方案
            if (this.cacheObj.tagName.includes(lowerCaseName)) {
                return {
                    customRule: false,
                    success: true,
                }
            }
            return {
                customRule: false,
                success: false,
            }
        }

        let success = false
        if (!this.cacheObj.tagName && !this.cacheObj.selector) {
            console.log(this.cacheObj)
            console.error('tagName or selector must be provided')
            alert('tagName or selector must be provided')
        }
        if (this.cacheObj.goodElementMapping.has(target)) {
            // console.log(target, 'match cache', this.cacheObj.goodElementMapping.get(target))
            success = true
        } else if (this.cacheObj.tagName && this.cacheObj.tagName.includes(lowerCaseName)) {
            // console.log(target, 'match tag name', this.cacheObj.tagName)
            this.cacheObj.goodElementMapping.set(target, target) //映射自己
            success = true
        } else if (this.cacheObj.selector) {
            const _target = target
            const element = document.querySelector(this.cacheObj.selector)
            if (element) {
                while (target) {
                    // find from accesstor
                    if (target === element) {
                        this.cacheObj.goodElementMapping.set(_target, element) // 映射到由selector获得的元素
                        // console.log(target, 'match selector', this.cacheObj.selector)
                        success = true
                        break
                    }
                    target = target.parentElement
                }
            }
        }
        return {
            customRule: true,
            success,
            element: this.cacheObj.goodElementMapping.get(target) || document.querySelector(this.cacheObj.selector)
        }
    }
}



function setStyleArrtibute(target, value) {
    if (target.attributes['style']) {
        target.dataset['style'] = target.attributes['style'].value
    } else {
        target.dataset['style'] = ''
    }
    target.setAttribute('style', value)
}

function restoreStyleArrtibute(target) {
    target.setAttribute('style', target.dataset['style'])
    delete target.dataset['style']
}


function hideOtherElement(elem) {
    if (elem === document.body) {
        return
    }
    for (const child of elem.parentElement.children) {
        if (child !== elem) {
            _hideElement(child)
        }
    }
    hideOtherElement(elem.parentElement)
}

async function onCreatePopupWindow() {
    // bilibili_live 的修复实例里有相关的变量修改
    console.log('popup window is created')

    isPopup = true
    popupToolBar.showRestoreBtn()
    popupToolBar.hidePopupBtn()

    currentContainer.scrollIntoView({
        behavior: "instant",
        block: "start",
        inline: "start"
    });
}



function afterDestoryPopupWindow() {
    isPopup = false
    console.log('popup window is destory')
    const el = document.querySelector('#popup-tool-style')
    el && el.remove()
    popupToolBar.showPopupBtn()
    popupToolBar.hideRestoreBtn()
}

function callbackForFixup(obj) {
    // 根据obj修改变量
    if (!obj) {
        return
    }
    if (obj.currentContainer) {
        currentContainer = obj.currentContainer
    }
    if (obj.currentVideoElement)[
        currentVideoElement = obj.currentVideoElement
    ]
}



function makeVideoContainerFixed() {
    setStyleArrtibute(currentContainer, 'position: fixed !important; width: 100% !important; height: 100% !important; padding: 0px !important; margin: 0px !important;')
}

/**
 * 查找可能的、相邻的 video 元素. 首先从target开始往祖先元素查找, 若找到元素的 id 或 className 包含 player 字符的元素则将它视为video容器元素, 再从这个容器元素里寻找符合条件的 video 元素
 * @param {HTMLElement} target 从target开始往祖先元素查找
 * @param {Boolean} findContainer 是否需要找容器, true 寻找容器, false 把 target 当成容器
 * @returns {[HTMLElement,HTMLElement]} 返回元素数组，第1个元素是Container(一定不为 null ), 第2个元素是Video(可能为 null ). 
 */
function searchVideoElement(target, findContainer = true) {

    const MAX_SEARCH_LEVEL = 2

    function check(t) {
        // 检查 id 或 className 是否含有player字符
        return (t.id && t.id.includes('player')) || (t.className && t.className.includes('player'))
    }

    let videoContaier = target;
    let currentLevel = 0
    // 找到疑似的video容器
    while (findContainer && videoContaier) {
        if (currentLevel >= MAX_SEARCH_LEVEL) {
            break
        }
        if (check(videoContaier)) {
            if (check(videoContaier.parentElement)) {
                // videoContaier.parentElement.parentElement也可能是容器，继续往上级查找
            } else {
                // 找到最终的容器
                break
            }
            currentLevel++
        }
        videoContaier = videoContaier.parentElement
    }

    if (!findContainer) {
        videoContaier = target.parentElement
    }

    if (!videoContaier) {
        // 没有找到
        return [null, null]
    }

    let targetVideo = null
    for (const video of videoContaier.querySelectorAll('video')) {
        // 对 容器内的video元素进行二次检查
        // 排除那些隐藏的、长宽太小的video元素

        const style = window.getComputedStyle(video)
        if (style['display'] === 'none') {
            targetVideo = null
            continue
        }

        const rect = video.getBoundingClientRect()
        if (rect.width < MIN_VALID_WIDTH && rect.height < MIN_VALID_HEIGHT) {
            targetVideo = null
            continue
        }

        targetVideo = video
        break
    }

    return [videoContaier, targetVideo]

}



function main(event) {
    if (isPopup) {
        return
    }
    const res = extensionRule.match(event.target)

    // res.customRule 自定义匹配的规则是否存在，不存在的话使用默认规则进行检查，
    // res.success 匹配是否成功
    // res.element 返回由规则指定的容器

    if (res.customRule && res.success) {

        // 使用自定义规则且匹配成功
        currentContainer = res.element
        currentVideoElement = searchVideoElement(res.element, false)[1]

        // console.log('1', currentContainer, currentVideoElement)
        if (!popupToolBar.parentElement) {
            //popupToolBar 没有父元素也就是没有添加到 document.body
            popupToolBar.display(currentContainer)
            return
        }
    } else if (!res.customRule && res.success) {
        // 使用了默认规则并且匹配成功
        if (event.target.tagName === 'OBJECT' || event.target.tagName === 'EMBED') {
            // flash 播放器
            const rect = event.target.getBoundingClientRect()
            if (rect.width <= MIN_VALID_WIDTH || rec.height <= MIN_VALID_HEIGHT) {
                currentContainer = currentVideoElement = null
            } else {
                currentContainer = currentVideoElement = event.target
            }
        } else {
            [currentContainer, currentVideoElement] = searchVideoElement(event.target, false)
        }
        if (currentVideoElement && !popupToolBar.parentElement) {
            popupToolBar.display(currentContainer)
        }
        // console.log(2, currentContainer, currentVideoElement)
    } else if (!res.success) {

        // 检测是否在popupToolBar触发，popupToolBar只有4层元素
        let p = event.target
        let q = popupToolBar.toolbar
        if (p === q || (p.parentElement && p.parentElement === q) || (p.parentElement && p.parentElement.parentElement && p.parentElement.parentElement === q) || (p.parentElement && p.parentElement.parentElement && p.parentElement.parentElement.parentElement && p.parentElement.parentElement.parentElement === q)) {
            //不处理事件
            return
        }

        // 鼠标移动到其他地方，移除 toolbar
        popupToolBar.remove()

    }

}

class SelectableLayer {
    constructor() {
        this.onKeypress = this.onKeypress.bind(this)

        this.map = new WeakMap()
        this.layer = document.createElement('div')
        this.subLayers = []
        this.videos = Array.from(document.querySelectorAll('video,object,embed')).filter(node => {
            const rect = node.getBoundingClientRect()
            return rect.height > 100 && rect.width > 100
        })
        let zIndex = 9999999
        const bodyRect = document.body.getBoundingClientRect()
        this.layer.setAttribute('style', `
            position:fixed;
            width:100%;
            height:100%;
            z-index:${zIndex};
            background-color: black;
            left: 0px;
            top: 0px;
            opacity: 0.5;
        `)
        const subLayerPrototype = document.createElement('div')
        subLayerPrototype.setAttribute('style', `
            position:absolute;
            z-index:${zIndex+1};
            background-color:#9c4324;
            opacity:0.5;
            cursor:pointer;
        `)
        for (const video of this.videos) {
            const rect = video.getBoundingClientRect()
            const cloned = subLayerPrototype.cloneNode(true)
            cloned.className = 'x-layer'
            cloned.style.left = `${rect.left + window.scrollX}px`
            cloned.style.top = `${rect.top + window.scrollY}px`
            cloned.style.width = `${rect.width}px`
            cloned.style.height = `${rect.height}px`
            cloned.addEventListener('click', this.onClick.bind(this))
            document.body.appendChild(cloned)
            this.map.set(cloned, video)
            this.subLayers.push(cloned)
        }

        this.layer.addEventListener('click', this.onClick.bind(this))
        document.addEventListener('keypress', this.onKeypress)
    }
    display() {
        document.body.appendChild(this.layer)
        for (const a of this.subLayers) {
            document.body.appendChild(a)
        }
    }
    remove() {
        document.removeEventListener('keypress', this.onKeypress)
        this.layer.remove()
        for (const node of this.subLayers) {
            node.remove()
        }
    }
    onKeypress(event) {
        if (event.key === 'Escape') {
            this.remove()
        }
    }
    onClick(event) {
        if (event.target === this.layer) {
            this.remove()
            return
        } else {
            main({
                target: this.map.get(event.target)
            })
            popupToolBar.toolbar.querySelector('#x-popup').click()
            this.remove()
        }
    }
}

let selectableLayer = null

browser.runtime.onMessage.addListener(message => {
    if (message.command === 'popupVideo') {
        const rule = extensionRule.getRule()
        if (rule.name === 'DEFAULT') {
            // alert('the rule should not be DEFAULT')
            // throw new Error('the rule should not be DEFAULT')
            if (!selectableLayer) selectableLayer = new SelectableLayer()

            selectableLayer.display()
            return
        } else {
            // 触发main，保证 currentContainer 和 currentVideoElement 都获取成功
            main({
                target: document.querySelector(rule.selector)
            })
            // 模拟点击"弹窗"
            popupToolBar.toolbar.querySelector('#x-popup').click()
        }
    }
})

window.addEventListener('resize', event => {
    if (isPopup) {
        event.preventDefault()
        event.stopPropagation()

    }
}, {
    capture: true,
    passive: false
})

document.addEventListener('mouseover', main, {
    capture: true,
    passive: true
})


let timeoutId = 0
let currentEventCount = 0
const timeToRemove = 2000
const MAX_EVENT_COUNT = 30 // 限制 mousemove 的触发频率
document.addEventListener('mousemove', event => {
    if (currentEventCount < MAX_EVENT_COUNT) {
        currentEventCount += 1
        return
    } else {
        currentEventCount = 0
    }
    if (!isPopup) {
        main(event)
        return
    }
    // 鼠标在指定时间内没有移动的话，自动隐藏 toolbar
    popupToolBar.display(currentContainer)
    window.clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
        popupToolBar.remove()
    }, timeToRemove)
}, {
    capture: true,
    passive: true
})