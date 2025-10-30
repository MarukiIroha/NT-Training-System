import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import QuestionBank from "./QuestionBank";

import Practice from "./Practice";

import ExamMode from "./ExamMode";

import Reports from "./Reports";

import Forum from "./Forum";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    QuestionBank: QuestionBank,
    
    Practice: Practice,
    
    ExamMode: ExamMode,
    
    Reports: Reports,
    
    Forum: Forum,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/QuestionBank" element={<QuestionBank />} />
                
                <Route path="/Practice" element={<Practice />} />
                
                <Route path="/ExamMode" element={<ExamMode />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/Forum" element={<Forum />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}