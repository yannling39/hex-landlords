export default function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>斗地主</h1>
        <span className="run-label">单机练习</span>
      </header>
      <section className="table-placeholder" aria-label="牌桌">
        <p role="status">正在准备牌桌</p>
      </section>
    </main>
  );
}
