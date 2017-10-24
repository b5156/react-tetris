/**
 * Created by aaron on 2017/3/22.
 */

import mobx, {observable, computed, action, autorun} from 'mobx';
import React from 'react';
//import * as mobx from 'mobx'
import update from 'immutability-helper';
import config from './config';
import Group from './groups';
import {uniqueArr} from './utils';
import ls from 'store';


let activeGroup = {}; //正在下坠
let predictGroup = {};//预估终点
let readyList = [];//就绪的方块组

let speed = config.SPEED, //下落速度
    scroe = 0,//本轮得分
    timers = [];//定时器

/**
 * 整个tetris的数据模型
 */

let store = observable({
    actives: [],//活动中的
    predicts: [],//预估终点
    stables: [],//稳定的方块组
    totalScore: 0,//总得分
    currentRoundCount: 0,
    readyGroup: {},

    isIng: true,//是否进行中
    roundCount: 0,//当前回合计数

    //历史最高分
    get hstScore() {
        let best = ls.get('best') || 0;
        if (this.totalScore > best) {
            ls.set('best', this.totalScore);
            return this.totalScore;
        } else {
            return best;
        }
    },

    get readyGroupDOM() {
        //这里有一bug，本该直接使用state的。
        let arr = table2array(rotateState(this.readyGroup.state)).reverse();
        return arr.map((row, ir) =>
            <div className="clearfix right" key={ir}>{
                row.map((col, ic) =>
                    <div key={ic} className={`g bg-${col}`}/>
                )}
            </div>);
    },

    //当前状态
    get table() {
        let pureTable = createPureTable();
        //将所有实心g填入pureTable
        //console.log(mobx.toJS(this.predicts),55);

        let arr = mobx.toJS(this.actives).concat(mobx.toJS(this.stables));
        arr.forEach(g => {
            pureTable[g] = 1;
        });
        //mobx.toJS(this.predicts).forEach(g => {
        //    pureTable[g] = 2;
        //});
        //mobx.toJS(this.stables)
        //this.actives.concat(this.stables).concat(this.predicts).forEach(key => {
        //    pureTable[key] = 1;
        //});
        return pureTable;
    }

});
autorun(() => {
    //当状态发生变化,自动开始或停止计时器
    //console.log('isIng:', store.isIng);
    if (store.isIng) {
        //开始一个计时器
        timers.push(setInterval(tick, speed));
    } else {
        //停止所有计时器
        timers.forEach(t => clearInterval(t))
    }
});

/**
 * 创建一个对象，它是所有的g的表示。。
 * @returns {{}}
 */
function createPureTable() {
    let table = {};
    for (let y = 0; y < config.ROW; y++) {
        for (let x = 0; x < config.COL; x++) {
            table[x + '*' + y] = 0;
        }
    }
    return table;
}


/**
 * 重新开始
 */
function gameRestart() {
    store.currentRoundCount = 0;//总轮数清零
    store.totalScore = 0;//总得分清零
    store.stables = [];

    newRound();//新一轮
}

/**
 * 移动group
 * @param dir 方向
 * @param step 步数
 * @param fromTick 是否为常规下落
 */
function moveStep(dir = 'y', step = 1, fromTick = false) {
    //console.log(dir);
    if (!store.isIng) return;

    let gap = getEndGroupGap(activeGroup);


    if (dir === 'y') {

        if (gap === 0 && fromTick) {
            //结束
            //本轮结束
            completeRound();
        } else if (step >= gap) {
            //下底
            activeGroup = update(activeGroup, {y: {$apply: v => v + gap}});
        } else {
            //落n格
            activeGroup = update(activeGroup, {y: {$apply: v => v + step}});
        }

    }
    else if (dir === 'x') {
        activeGroup = update(activeGroup, {x: {$apply: v => v + step}});
        //修正一次
        activeGroup = correction(activeGroup, step > 0 ? 2 : 1);
    } else if (dir === 'o') {
        //旋转一次
        activeGroup = update(activeGroup, {state: {$apply: rotateState}});
        //修正一次
        activeGroup = correction(activeGroup, 0);
    }

    store.actives = groupToArray(activeGroup);

    //predictGroup = Object.assign({}, activeGroup);
    //predictGroup.y = activeGroup.y + gap;
    //for (let k in predictGroup.state) {
    //    if (predictGroup.state[k] === 1) {
    //        predictGroup.state[k] = 2;
    //    }
    //}
    //store.predicts = groupToArray(predictGroup)
}

/**
 * 尝试修正到合适位置,修正成功则返回新的group
 * @param group
 * @param origin 来自旋转(0)/左边(1)/右边(2)
 * @returns {group}
 */
function correction(group, origin = 0) {
    //稳定的g
    //将group与已经稳定的方块对比。
    //将超出左右和发生重叠的g的x值提出。
    let sArr = uniqueArr(store.stables);
    let cArr = [];//重叠的g

    //找出重叠的g,这里有优化的空间,可剪短sArr的长度
    Object.keys(group.state).forEach(key => {
        let realKey = parseKey(key, {x: group.x, y: group.y}).key;
        if (group.state[key] === 1) {
            if (parseKey(realKey).x < 0 || parseKey(realKey).x > config.COL - 1) {
                //超出左右
                //console.log('超出左右');
                cArr.push(parseKey(key).x);
            }
            sArr.forEach(sg => {
                if (realKey === sg) {
                    //发生重叠
                    cArr.push(parseKey(key).x);
                }
            })
        }
    });

    //修正到合适位置, 只有左、右需要修正，上下不需要.
    uniqueArr(cArr).forEach(x => {

        if (origin === 0) {
            //旋转后修复

            if (x < 2) {
                //这里的2是因为16个方块，从小于第2列开始是左方，以此类推
                //左边重叠,将右移
                console.log('修复左边');
                group.x += 1;
            }
            if (x > 1) {
                //右边重叠，将左移
                console.log('修复右边');
                group.x -= 1;
            }
        } else if (origin === 1) {

            //左右移动后修复
            if (x <= 2) {
                //这里的2是因为16个方块，从小于第2列开始是左方，以此类推
                //左边重叠,将右移
                console.log('修复左边');
                group.x += 1;
            }

        } else if (origin === 2) {

            if (x >= 1) {
                //右边重叠，将左移，I类型从1列开始
                console.log('修复右边');
                group.x -= 1;
            }
        }
    });

    return group;
}


/**
 * 将key转换成坐标
 * @param key
 * @param offset 偏移量
 * @returns {{}}
 */
function parseKey(key, offset) {
    offset = offset || {x: 0, y: 0};
    let x = parseInt(key.split('*')[0]) + offset.x;
    let y = parseInt(key.split('*')[1]) + offset.y;
    return {x: x, y: y, key: x + '*' + y};
}

/**
 * 获取最大可下落的距离
 * @param group
 * @returns {number}
 */
function getEndGroupGap(group) {

    let arr = groupToArray(group);
    let minGap = config.ROW;
    let sArr = uniqueArr(store.stables);
    arr.forEach(a => {
        //取一个最小间隔
        if (config.ROW - parseKey(a).y < minGap) {
            minGap = config.ROW - parseKey(a).y;
        }
        //当底部还有其他稳定的方块
        sArr.forEach(s => {
            if (parseKey(a).x === parseKey(s).x && parseKey(s).y > parseKey(a).y && parseKey(s).y - parseKey(a).y < minGap) {
                minGap = parseKey(s).y - parseKey(a).y;
            }
        })
    });
    return minGap - 1;//去除重复后
}


/**
 * 筛选出所有实心块
 * @param group
 * @returns {Array}
 */
function groupToArray(group) {
    let arr = [];
    for (let key in group.state) {
        if (group.state[key] > 0) {
            let x = parseInt(key.split('*')[0]);
            let y = parseInt(key.split('*')[1]);
            x += group.x;
            y += group.y;
            arr.push(x + '*' + y);
        }
    }
    return arr;
}

/**
 * 结束本轮
 */
function completeRound() {

    //本轮结束，暂停tick。
    store.isIng = false;

    //消去行后的稳定组
    store.stables = cleanAndDecline(store.stables.concat(store.actives));

    if (mobx.toJS(store.actives).some(item => parseKey(item).y <= 0)) {
        console.log('触顶');
        gameOver();
    } else {
        console.log('新一轮');
        newRound();
    }
}
/**
 * 消除掉填满的行
 * @param arr
 * @param onCleanEveryLine
 * @returns {*[]|*}
 */
function cleanAndDecline(arr, onCleanEveryLine) {
    arr = uniqueArr(arr);

    //找出已经填满的行
    let fulls = [];
    let obj = {};
    for (let k in arr) {
        let row = parseKey(arr[k]).y;
        if (!obj[row]) {
            obj[row] = 1;
            //console.log('get one:', row);
        } else {
            obj[row] += 1;
            if (obj[row] >= config.COL) {
                fulls.push(row);
            }
        }
    }

    scroe = Math.pow(config.EACH_S, fulls.length);
    store.totalScore += scroe;
    //console.log(roundScroe);


    fulls.forEach(row => {
        //console.log('将消去行：', row);
        //消除
        arr = arr.filter(item => parseKey(item).y !== row);
        //下落
        arr = arr.map(v => {
            let locx = parseKey(v).x;
            let locy = parseKey(v).y;
            if (locy < parseInt(row)) {
                locy += 1;
                return locx + '*' + locy;
            } else {
                return v;
            }
        });
    });
    //console.log('本轮得分:', roundScroe);
    return arr;
}

/**
 *
 */
function gameOver() {
    console.log('game over !');
    alert('game over!')
    store.isIng = false;
    //clearInterval(timer);
}


/**
 * 暂停游戏
 */
function gamePause() {
    store.isIng = !store.isIng;
    //clearInterval(timer);
}


/**
 * 开始新一轮
 */
function newRound() {
    store.actives = [];
    store.currentRoundCount += 1;
    while (readyList.length < 2) {
        readyList.push(new Group());
    }
    //console.log(readyList.concat());
    activeGroup = readyList.shift();//新一轮的时候，取前面一个
    store.readyGroup = readyList[0];//下一轮的组
    speed = speed - config.SPEED_A;
    store.isIng = true;//进行中
}

/**
 * 计时器回调
 */
function tick(e) {
    moveStep('y', 1, true);
}
/**
 * 将一个表转换成二维数组（方便dom渲染）
 * @param table
 * @returns {Array}
 */
function table2array(table) {
    let arr = [];

    for (let k in table) {
        let ks = k.split('*');
        if (arr[ks[0]] === undefined) arr[ks[0]] = [];
        arr[ks[0]][ks[1]] = table[k];
    }
    return arr;
}


/**
 * 将state旋转90度,旋转以后判断是否超出了边界或重叠，整将坐标修正回边界以内。
 * @param state
 * @returns {{}}
 */
function rotateState(state) {
    let map = {
        '0*0': '3*0', '1*0': '3*1', '2*0': '3*2', '3*0': '3*3',
        '0*1': '2*0', '1*1': '2*1', '2*1': '2*2', '3*1': '2*3',
        '0*2': '1*0', '1*2': '1*1', '2*2': '1*2', '3*2': '1*3',
        '0*3': '0*0', '1*3': '0*1', '2*3': '0*2', '3*3': '0*3',
    };
    let nextState = {};
    for (let key in state) {
        nextState[map[key]] = state[key];
    }
    return nextState;
}


export {
    store,
    gameRestart,
    moveStep,
    gamePause,
    table2array,
};