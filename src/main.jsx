import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.jsx';
import './styles/globals.css';
import './styles/month.css';

createRoot(document.getElementById('root')).render(React.createElement(App));
