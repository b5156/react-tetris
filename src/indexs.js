/**
 * Created by aaron on 2017/3/16.
 */
import React from 'react';
import {render} from 'react-dom';
import Hammer from 'hammerjs';
import {observer} from 'mobx-react';
import './style.css';
import {tetrisStore, COL, ROW, init, moveStep, gamePause, gameReplay, gameContinue} from './store';


class Page extends React.Component {
    render() {
        return <Game tetrisStore={tetrisStore}/>
    }
}

@observer
class Game extends React.Component {
    render() {
        return (
            <div class="flex">
                <div id="stage">
                    {
                        this.props.tetrisStore.table.map(function (row) {
                            return <div>{
                                row.map(function (col) {
                                    return <div class={(col.val ? g1 : g0)}>{}</div>
                                })
                            }</div>
                        })
                    }
                </div>
                <div class="flex-auto">
                    <h2>得分：{this.props.tetrisStore.score}</h2>
                    <button type="button" onClick={() => {
                        gamePause()
                    }}>暂停游戏
                    </button>
                    <hr/>
                    <button type="button" onClick={() => {
                        gameContinue()
                    }}>继续游戏
                    </button>
                    <hr/>
                    <button type="button" onClick={() => {
                        gameReplay()
                    }}>重新开始
                    </button>

                    <div style={{fontSize: '0.24rem', marginTop: '0.2rem', lineHeight: '2'}}>
                        <div>点击:<br/>旋转方块</div>
                        <br/>
                        <div>左/右/下滑动:<br/>移动方块</div>
                        <br/>
                        <div>上滑:<br/>直接坠落</div>
                        <p>version:0.1.0</p>
                    </div>
                </div>
            </div>
        )
    }

    state = {
        eventPhase: 0
    };

    addHammer() {
        let t = this;
        let relaxTime = 0;
        let mc = new Hammer(document.getElementById('stage'));
        mc.get('pan').set({direction: Hammer.DIRECTION_ALL});
        mc.on("tap panleft panright pandown", function (e) {
            //console.log('惯性:', e.deltaY < -100);
            if (e.type === 'tap') {
                moveStep('o');
                return;
            }
            if (e.timeStamp - relaxTime < 150) {
                //衰减触发频率,控制在100毫秒以内
                return;
            }
            if (e.additionalEvent === 'panright') {
                moveStep('x');
            } else if (e.additionalEvent === 'panleft') {
                moveStep('x', -1);
            } else if (e.additionalEvent === 'pandown') {
                moveStep('y');
            }
            relaxTime = e.timeStamp;
        });
        mc.get('swipe').set({direction: Hammer.DIRECTION_VERTICAL});
        mc.on('swipeup', function (e) {
            //console.log(e);
            //坠落到底
            moveStep('y', 1, true, true);
        })
    }

    componentDidMount() {
        let t = this;
        //console.log(this.props.tetrisStore.table);
        init();
        t.addHammer();
    }
}

render(<Page/>, document.getElementById('root'));

