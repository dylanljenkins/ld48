import './index.css';
import * as serviceWorker from './serviceWorker';
import * as React from "react";
import * as ReactDOM from "react-dom";
import './App.css';
import {Box, Grommet} from "grommet";
import {LagomGameComponent} from "lagom-engine";
import {LD48} from './LD48';

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

const game = new LD48();

const grommetTheme = {
    global: {
        font: {
            size: '14px',
            height: '20px',
        }
    }
};

const App = () => (
    <Grommet theme={grommetTheme as any} style={{height: "100%"}}>
        <Box direction="column" flex style={{height: "100%"}}>
            <Box direction="row" flex fill>
                <Box flex align="center" justify="center">
                    <LagomGameComponent game={game}/>
                </Box>
                {/*<Box width="medium" background="light-2">*/}
                {/*    <InspectorComponent game={game}/>*/}
                {/*</Box>*/}
            </Box>
        </Box>
    </Grommet>
);

ReactDOM.render(
    <App/>,
    document.getElementById("root"));
