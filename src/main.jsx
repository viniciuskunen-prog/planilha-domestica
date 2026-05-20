import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.jsx';
import './styles/globals.css';
import './styles/month.css';
import './styles/iphone.css';

const rootNode = document.getElementById('root');
const root = createRoot(rootNode);
root.render(React.createElement(App));
