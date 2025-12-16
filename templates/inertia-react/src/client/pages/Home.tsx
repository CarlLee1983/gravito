import React from 'react';

export default function Home({ msg }: { msg: string }) {
    const [count, setCount] = React.useState(0);

    return (
        <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '50px' }}>
            <h1>🚀 Gravito + Inertia + React</h1>
            <p>{msg}</p>

            <button
                onClick={() => setCount(count + 1)}
                style={{ padding: '10px 20px', fontSize: '1.2rem', cursor: 'pointer' }}
            >
                Count is: {count}
            </button>

            <div style={{ marginTop: '20px' }}>
                <a href="/about" style={{ color: '#6366f1' }}>Go to About Page (Inertia Link)</a>
            </div>
        </div>
    );
}
