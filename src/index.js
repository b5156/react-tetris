/**
 * Created by aaron on 2017/8/21.
 */

import './style.css';
import React from 'react';
import ReactDom from 'react-dom';
import Hammer from 'hammerjs';
import {observer} from 'mobx-react';
import {store, table2array, gameRestart, gamePause, moveStep} from './store';
import config from './config';

@observer
class App extends React.Component {
    render = () =>
        <div className="app">
            <div className="bar">
                <div>next:</div>
                <div className="clearfix">{store.readyGroupDOM}</div>
                <i className="divide"/>
                <div>score:</div>
                <div className="fs-18px">{store.totalScore}</div>
                <br/>
                <div>best:</div>
                <div>{store.hstScore}</div>
                <i className="divide"/>
                <div>
                    <button className="btn" onClick={gamePause} type="button">PAUSE</button>
                </div>
                <br/>
                <div>
                    <button className="btn" onClick={gameRestart} type="button">RESTART</button>
                </div>
            </div>

            <div id="stage">
                {table2array(this.props.store.table).map((row, ir) =>
                    <div className="clearfix" key={ir}>{
                        row.map((col, ic) =>
                            <div key={ic} className={`g bg-${col}`}/>
                        )}
                    </div>
                )}
            </div>
        </div>;

    state = {};

    componentDidMount() {
        this.addHammer();
        gameRestart();
    }

    addHammer() {
        let t = this;
        let relaxTime = 0;
        let mc = new Hammer(document.getElementById('stage'));
        mc.get('pan').set({direction: Hammer.DIRECTION_ALL});
        mc.on("tap panleft panright pandown", e => {
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
        mc.on('swipeup', (e) => {
            //console.log(e);
            //坠落到底
            moveStep('y', config.ROW, true, true);
        })
    }
}

ReactDom.render(<App store={store}/>, document.getElementById('root'));

