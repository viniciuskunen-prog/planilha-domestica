import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConnectedApp } from './app/ConnectedApp.jsx';
import './styles/globals.css';
import './styles/month.css';
import './styles/iphone.css';
import './styles/login.css';
import './styles/loading.css';

const rootNode = document.getElementById('root');
const root = createRoot(rootNode);
root.render(React.createElement(ConnectedApp));
