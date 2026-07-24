import { useCallback, useEffect, useState } from "react";
import { Background, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ApiError, apiRequest, clearToken, DEMO_MODE, getToken, saveToken } from "./api";
import "./App.css";


const serviceOptions = ["iPhone", "Android", "通信", "アプリ", "LINE", "料金・請求", "データ移行", "3rd", "その他"];


// デモモードで使う仮の利用者。ログインせずに全機能を管理者として体験できます。
const DEMO_USER = { id: 0, username: "デモ", role: "admin", is_active: true, created_at: new Date().toISOString() };


const createStep = () => ({
  id: crypto.randomUUID(),
  type: "normal",
  content: "",
  leftTitle: "Aの場合",
  leftContent: "",
  rightTitle: "Bの場合",
  rightContent: "",
  leftSteps: [],
  rightSteps: [],
});


const emptyForm = () => ({
  id: crypto.randomUUID(),
  title: "",
  service: "iPhone",
  question: "",
  rootCause: "",
  mode: "normal",
  solution: "",
  steps: [createStep()],
  useCount: 0,
  useHistory: [],
  createdAt: "",
});


function App() {
  const [authLoading, setAuthLoading] = useState(() => !DEMO_MODE && Boolean(getToken()));
  const [user, setUser] = useState(() => (DEMO_MODE ? DEMO_USER : null));
  const [loginError, setLoginError] = useState("");
  const [page, setPage] = useState("top");
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [apiError, setApiError] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [selectedPost, setSelectedPost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [searchWord, setSearchWord] = useState("");
  const [selectedService, setSelectedService] = useState("すべて");

  useEffect(() => {
    if (DEMO_MODE) return;

    const token = getToken();
    if (!token) return;

    apiRequest("/auth/me", { token })
      .then((currentUser) => setUser(currentUser))
      .catch(() => clearToken())
      .finally(() => setAuthLoading(false));
  }, []);

  const loadPosts = useCallback(async () => {
    const token = getToken();
    if (!DEMO_MODE && !token) return;

    setPostsLoading(true);
    setApiError("");
    try {
      const data = await apiRequest("/posts", { token });
      setPosts(data);
      setPostsLoaded(true);
    } catch (error) {
      if (!DEMO_MODE && error instanceof ApiError && error.status === 401) {
        clearToken();
        setUser(null);
      } else if (DEMO_MODE && error instanceof ApiError && error.status === 401) {
        // 画面はデモ、APIはログイン必須、という食い違い。原因が分かる案内を出します。
        setApiError("APIがログイン必須の設定になっています。画面側の VITE_DEMO_MODE とAPI側の DEMO_MODE を同じ値に揃えてください。");
      } else {
        setApiError(error.message);
      }
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 外部APIとの同期を開始します。状態更新そのものは非同期処理内で行われます。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) loadPosts();
  }, [user, loadPosts]);

  const handleLogin = async (username, password) => {
    setLoginError("");
    try {
      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: { username, password },
      });
      saveToken(result.access_token);
      setUser(result.user);
      setPage("top");
    } catch (error) {
      const message = error.status === 401
        ? "ユーザー名またはパスワードが違います。"
        : error.message;
      setLoginError(message);
      throw error;
    }
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setPosts([]);
    setPostsLoaded(false);
    setPage("top");
  };

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const savePost = async () => {
    if (!form.title.trim()) return alert("タイトルは必須です");
    if (!form.rootCause.trim()) return alert("根拠は必須です");

    try {
      if (editingPost) {
        const updatedData = {
          ...form,
          id: editingPost.id,
          useCount: editingPost.useCount ?? 0,
          useHistory: editingPost.useHistory ?? [],
        };
        const updatedPost = await apiRequest(`/posts/${editingPost.id}`, {
          method: "PUT",
          token: getToken(),
          body: { data: updatedData },
        });
        setPosts((current) => current.map((post) => post.id === editingPost.id ? updatedPost : post));
        setSelectedPost(updatedPost);
        setEditingPost(null);
      } else {
        const newData = {
          ...form,
          id: crypto.randomUUID(),
          useCount: 0,
          useHistory: [],
          createdAt: new Date().toISOString(),
        };
        const newPost = await apiRequest("/posts", {
          method: "POST",
          token: getToken(),
          body: { data: newData },
        });
        setPosts((current) => [newPost, ...current]);
      }

      setForm(emptyForm());
      setPage("top");
    } catch (error) {
      console.error(error);
      alert(error.message || "保存に失敗しました");
    }
  };

  const deletePost = async (id) => {
    if (!confirm("この投稿を削除しますか？")) return;
    try {
      await apiRequest(`/posts/${id}`, { method: "DELETE", token: getToken() });
      setPosts((current) => current.filter((post) => post.id !== id));
      setSelectedPost(null);
      setPage("top");
    } catch (error) {
      console.error(error);
      alert(error.message || "削除に失敗しました");
    }
  };

  const markPostUsed = async (id) => {
    if (!confirm("この情報をお客様対応に使用しましたか？")) return;
    try {
      const updatedPost = await apiRequest(`/posts/${id}/use`, {
        method: "PATCH",
        token: getToken(),
      });
      setPosts((current) => current.map((post) => post.id === id ? updatedPost : post));
      setSelectedPost((current) => current?.id === id ? updatedPost : current);
    } catch (error) {
      console.error(error);
      alert(error.message || "使用回数の更新に失敗しました");
    }
  };

  const openDetail = (post) => {
    setSelectedPost(post);
    setPage("detail");
  };

  const closePostForm = () => {
    setForm(emptyForm());
    setEditingPost(null);
    setPage("top");
  };

  const getRecentUseCount = (post) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return (post.useHistory || []).filter((usedAt) => new Date(usedAt) >= oneWeekAgo).length;
  };

  const filteredPosts = posts.filter((post) => {
    const words = searchWord.trim().split(/\s+/).filter(Boolean);
    const serviceMatch = selectedService === "すべて" || post.service === selectedService;
    const target = `${post.service} ${post.title} ${post.question} ${post.solution} ${post.rootCause} ${JSON.stringify(post.steps)}`;
    const wordMatch = words.length === 0 || words.every((word) => target.includes(word));
    return serviceMatch && wordMatch;
  }).sort((a, b) => getRecentUseCount(b) - getRecentUseCount(a));

  const getTrendLabel = (count) => {
    if (count >= 5) return "🔥入電激増";
    if (count >= 3) return "⚠️増加傾向";
    if (count >= 1) return "✅使用あり";
    return "🆕直近使用なし";
  };

  if (authLoading) return <LoadingScreen message="ログイン状態を確認しています..." />;
  if (!user) return <LoginPage onLogin={handleLogin} error={loginError} />;

  const header = <Header user={user} onLogout={handleLogout} />;

  if (page === "top") {
    return (
      <div className="app">
        {header}
        {apiError && <ErrorBanner message={apiError} onRetry={loadPosts} />}

        <div className="top-buttons">
          {user.role === "admin" && <button onClick={() => setPage("post")}>📝 投稿フォームを開く</button>}
          <button onClick={() => setPage("search")}>🔍 検索フォームを開く</button>
        </div>

        {postsLoading && <p className="status-message">ナレッジを読み込んでいます...</p>}
        {!postsLoading && postsLoaded && (
          <div className="top-grid">
            <section className="panel">
              <h2>🆕 最近投稿された情報</h2>
              <TitleList posts={posts.slice(0, 5)} openDetail={openDetail} />
            </section>

            <section className="panel">
              <h2>📈 使用回数ランキング</h2>
              <TitleList
                posts={[...posts].sort((a, b) => getRecentUseCount(b) - getRecentUseCount(a)).slice(0, 5)}
                openDetail={openDetail}
                showCount
                getRecentUseCount={getRecentUseCount}
                getTrendLabel={getTrendLabel}
              />
            </section>
          </div>
        )}
      </div>
    );
  }

  if (page === "post" && user.role === "admin") {
    return (
      <div className="app">
        {header}
        <BackButton onClick={closePostForm} />
        <h2>📝 {editingPost ? "ナレッジ編集" : "投稿フォーム"}</h2>

        <div className="form-page">
          <label>関連サービス</label>
          <select value={form.service} onChange={(event) => updateForm("service", event.target.value)}>
            {serviceOptions.map((service) => <option key={service}>{service}</option>)}
          </select>

          <label>タイトル</label>
          <input value={form.title} onChange={(event) => updateForm("title", event.target.value)} />

          <label>問い合わせ内容</label>
          <textarea value={form.question} onChange={(event) => updateForm("question", event.target.value)} />

          <div className="mode-row">
            <label><input type="radio" checked={form.mode === "normal"} onChange={() => updateForm("mode", "normal")} /> 通常</label>
            <label><input type="radio" checked={form.mode === "roadmap"} onChange={() => updateForm("mode", "roadmap")} /> ロードマップ形式</label>
          </div>

          {form.mode === "normal" ? (
            <>
              <label>解決した方法</label>
              <textarea value={form.solution} onChange={(event) => updateForm("solution", event.target.value)} />
            </>
          ) : (
            <RoadmapEditor steps={form.steps} setSteps={(steps) => updateForm("steps", steps)} />
          )}

          <label>情報の根拠 ※必須</label>
          <textarea value={form.rootCause} onChange={(event) => updateForm("rootCause", event.target.value)} />

          <div className="card-buttons">
            <button className="primary-button" onClick={savePost}>{editingPost ? "更新する" : "投稿する"}</button>
            <BackButton onClick={closePostForm} />
          </div>
        </div>
      </div>
    );
  }

  if (page === "search") {
    return (
      <div className="app">
        {header}
        <BackButton onClick={() => setPage("top")} />
        <h2>🔍 検索フォーム</h2>

        <div className="form-page">
          <div className="search-controls">
            <input placeholder="検索ワード" value={searchWord} onChange={(event) => setSearchWord(event.target.value)} />
            <select value={selectedService} onChange={(event) => setSelectedService(event.target.value)}>
              <option>すべて</option>
              {serviceOptions.map((service) => <option key={service}>{service}</option>)}
            </select>
          </div>

          <p>検索結果：{filteredPosts.length}件（直近7日間の使用回数が多い順）</p>
          <TitleList
            posts={filteredPosts}
            openDetail={openDetail}
            showCount
            getRecentUseCount={getRecentUseCount}
            getTrendLabel={getTrendLabel}
          />
          <BackButton onClick={() => setPage("top")} />
        </div>
      </div>
    );
  }

  if (page === "detail" && selectedPost) {
    return (
      <div className="app">
        {header}
        <BackButton onClick={() => setPage("top")} />

        <div className="detail-card">
          <h2>📌 {selectedPost.service}｜{selectedPost.title}</h2>
          <p className="meta">投稿日：{formatDate(selectedPost.createdAt)}｜使用回数：{selectedPost.useCount || 0}回</p>

          <div className="detail-section">
            <h3>問い合わせ内容</h3>
            <p>{selectedPost.question}</p>
          </div>

          <div className="detail-section">
            <h3>解決方法・ロードマップ</h3>
            {selectedPost.mode === "roadmap" ? <RoadmapView steps={selectedPost.steps || []} /> : <p>{selectedPost.solution}</p>}
          </div>

          <div className="detail-section">
            <h3>根拠</h3>
            <p>{selectedPost.rootCause}</p>
          </div>

          <div className="card-buttons">
            <button onClick={() => markPostUsed(selectedPost.id)}>この情報を使用した</button>
            {user.role === "admin" && (
              <>
                <button onClick={() => {
                  setForm(selectedPost);
                  setEditingPost(selectedPost);
                  setPage("post");
                }}>編集</button>
                <button className="delete-button" onClick={() => deletePost(selectedPost.id)}>削除</button>
              </>
            )}
          </div>
          <BackButton onClick={() => setPage("top")} />
        </div>
      </div>
    );
  }

  return null;
}


function LoginPage({ onLogin, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onLogin(username, password);
    } catch {
      // エラー内容は親コンポーネントに表示します。
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>📚 誰でもロードマップナレッジ</h1>
        <p className="login-description">業務用アカウントでログインしてください。</p>
        {error && <div className="error-banner" role="alert">{error}</div>}

        <label htmlFor="username">ユーザー名</label>
        <input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />

        <label htmlFor="password">パスワード</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />

        <button className="primary-button login-button" type="submit" disabled={submitting}>
          {submitting ? "接続中..." : "ログイン"}
        </button>
        <p className="login-note">初回アクセス時はバックエンドの起動に時間がかかる場合があります。</p>
      </form>
    </main>
  );
}


function Header({ user, onLogout }) {
  return (
    <>
      {/* デモモード中はログインしないため、利用者名とログアウトは表示しません。 */}
      {!DEMO_MODE && (
        <div className="session-bar">
          <span>{user.username}（{user.role === "admin" ? "管理者" : "利用者"}）</span>
          <button onClick={onLogout}>ログアウト</button>
        </div>
      )}
      <h1>📚 誰でもロードマップナレッジ</h1>
      <p className="warning">🚨 根拠確認必須！ 根拠が公式資料にない場合は、必ず「可能性」や「推測」として伝えること！ 🚨</p>
    </>
  );
}


function LoadingScreen({ message }) {
  return <main className="loading-screen"><p>{message}</p></main>;
}


function ErrorBanner({ message, onRetry }) {
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry}>再試行</button>}
    </div>
  );
}


function BackButton({ onClick }) {
  return <button className="back-button" onClick={onClick}>← TOPへ戻る</button>;
}


function TitleList({ posts, openDetail, showCount = false, getRecentUseCount, getTrendLabel }) {
  if (posts.length === 0) return <p className="empty">まだ投稿はありません。</p>;

  return (
    <div className="card-list">
      {posts.map((post) => {
        const recentCount = getRecentUseCount ? getRecentUseCount(post) : post.useCount || 0;
        const trendLabel = getTrendLabel ? getTrendLabel(recentCount) : "";
        return (
          <button className="title-card" key={post.id} onClick={() => openDetail(post)}>
            <span>📌 {post.service}｜{post.title}</span>
            {showCount && <span className="count">{trendLabel} / 直近7日：{recentCount}回</span>}
          </button>
        );
      })}
    </div>
  );
}


function RoadmapEditor({ steps, setSteps }) {
  const updateStep = (index, newStep) => {
    const copy = [...steps];
    copy[index] = newStep;
    setSteps(copy);
  };
  const deleteStep = (index) => setSteps(steps.filter((_, itemIndex) => itemIndex !== index));

  return (
    <div className="roadmap-editor">
      <h3>🧭 解決ロードマップ</h3>
      {steps.map((step, index) => (
        <StepEditor
          key={step.id}
          step={step}
          updateStep={(newStep) => updateStep(index, newStep)}
          deleteStep={() => deleteStep(index)}
        />
      ))}
      <button onClick={() => setSteps([...steps, createStep()])}>＋ STEP追加</button>
    </div>
  );
}


function StepEditor({ step, updateStep, deleteStep }) {
  const change = (key, value) => updateStep({ ...step, [key]: value });
  return (
    <div className="step-box">
      <div className="step-header">
        <div className="mini-radio-row">
          <label><input type="radio" checked={step.type === "normal"} onChange={() => change("type", "normal")} /> 通常</label>
          <label><input type="radio" checked={step.type === "branch"} onChange={() => change("type", "branch")} /> 分岐</label>
        </div>
        <button className="small-delete" onClick={deleteStep}>削除</button>
      </div>

      {step.type === "normal" ? (
        <textarea placeholder="対応内容" value={step.content} onChange={(event) => change("content", event.target.value)} />
      ) : (
        <div className="branch-area">
          <BranchEditor titleKey="leftTitle" contentKey="leftContent" stepsKey="leftSteps" step={step} updateStep={updateStep} />
          <BranchEditor titleKey="rightTitle" contentKey="rightContent" stepsKey="rightSteps" step={step} updateStep={updateStep} />
        </div>
      )}
    </div>
  );
}


function BranchEditor({ titleKey, contentKey, stepsKey, step, updateStep }) {
  const childSteps = step[stepsKey] || [];
  const change = (key, value) => updateStep({ ...step, [key]: value });
  const setChildSteps = (newSteps) => updateStep({ ...step, [stepsKey]: newSteps });

  return (
    <div className="branch-box">
      <input className="branch-title" value={step[titleKey]} onChange={(event) => change(titleKey, event.target.value)} />
      <textarea placeholder={`${step[titleKey]}の内容`} value={step[contentKey]} onChange={(event) => change(contentKey, event.target.value)} />
      <RoadmapEditor steps={childSteps} setSteps={setChildSteps} />
    </div>
  );
}


const ROADMAP_NODE_WIDTH = 400;
const ROADMAP_BRANCH_GAP = 160;
const ROADMAP_ROW_HEIGHT = 240;

// 分岐先の部分木が必要とする横幅を再帰的に測定します。
// これにより、ネストした分岐同士が同じX座標に重なるのを防ぎ、必要な分だけ横に広がります。
function measureRoadmapWidth(items) {
  let width = ROADMAP_NODE_WIDTH;
  items.forEach((step) => {
    if (step.type === "branch") {
      const leftWidth = measureRoadmapWidth(step.leftSteps || []);
      const rightWidth = measureRoadmapWidth(step.rightSteps || []);
      width = Math.max(width, leftWidth + ROADMAP_BRANCH_GAP + rightWidth);
    }
  });
  return width;
}

function RoadmapView({ steps }) {
  const nodes = [];
  const edges = [];
  let count = 0;

  const addNodes = (items, parentId = null, centerX = 600, y = 120) => {
    let previousId = parentId;
    items.forEach((step, index) => {
      const currentY = y + index * ROADMAP_ROW_HEIGHT;
      if (step.type === "normal") {
        const id = step.id || `node-${count++}`;
        nodes.push({ id, position: { x: centerX - ROADMAP_NODE_WIDTH / 2, y: currentY }, data: { label: step.content || "未入力" }, style: nodeStyle });
        if (previousId) edges.push({ id: `${previousId}-${id}`, source: previousId, target: id });
        previousId = id;
        return;
      }

      if (step.type === "branch") {
        const leftWidth = measureRoadmapWidth(step.leftSteps || []);
        const rightWidth = measureRoadmapWidth(step.rightSteps || []);
        const pairWidth = leftWidth + ROADMAP_BRANCH_GAP + rightWidth;
        const leftCenterX = centerX - pairWidth / 2 + leftWidth / 2;
        const rightCenterX = centerX + pairWidth / 2 - rightWidth / 2;

        const leftId = `${step.id}-left`;
        const rightId = `${step.id}-right`;
        nodes.push({ id: leftId, position: { x: leftCenterX - ROADMAP_NODE_WIDTH / 2, y: currentY }, data: { label: step.leftContent || "未入力" }, style: nodeStyle });
        nodes.push({ id: rightId, position: { x: rightCenterX - ROADMAP_NODE_WIDTH / 2, y: currentY }, data: { label: step.rightContent || "未入力" }, style: nodeStyle });

        if (previousId) {
          edges.push({ id: `${previousId}-${leftId}`, source: previousId, target: leftId, label: step.leftTitle });
          edges.push({ id: `${previousId}-${rightId}`, source: previousId, target: rightId, label: step.rightTitle });
        }

        addNodes(step.leftSteps || [], leftId, leftCenterX, currentY + ROADMAP_ROW_HEIGHT + 20);
        addNodes(step.rightSteps || [], rightId, rightCenterX, currentY + ROADMAP_ROW_HEIGHT + 20);
        previousId = null;
      }
    });
  };

  addNodes(steps, null, 600, 120);
  return (
    <div className="flow-box">
      <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.25 }} minZoom={0.1} colorMode="dark">
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}


function formatDate(value) {
  if (!value) return "不明";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ja-JP");
}


const nodeStyle = {
  background: "#2563eb",
  color: "white",
  borderRadius: "14px",
  padding: "14px",
  border: "1px solid #93c5fd",
  fontSize: 15,
  fontWeight: "600",
  width: 400,
  minHeight: 80,
  textAlign: "center",
  lineHeight: 1.7,
  boxShadow: "0 6px 20px rgba(37,99,235,0.35)",
};


export default App;
