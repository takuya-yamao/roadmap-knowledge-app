import { useEffect, useState } from "react";
import { ReactFlow, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./App.css";

const serviceOptions = ["iPhone", "Android", "通信", "アプリ", "LINE", "料金・請求", "データ移行", "3rd","その他"];

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

const samplePosts = [
  {
    id: "sample-line-voice",
    title: "LINE電話　相手の声聞こえない",
    service: "LINE",
    question: "LINE電話で相手の声が聞こえなくなった。できるように改善して欲しい。",
    rootCause: "支援者に確認",
    mode: "roadmap",
    solution: "",
    useCount: 6,
    useHistory: [
      new Date().toISOString(),
      new Date().toISOString(),
      new Date().toISOString(),
      new Date().toISOString(),
      new Date().toISOString(),
      new Date().toISOString(),
    ],
    createdAt: "2026/5/25 5:52:42",
    steps: [
      {
        id: "line-step-0",
        type: "normal",
        content: "LINE電話のみ or 電話アプリ全般",
        leftTitle: "Aの場合",
        leftContent: "",
        rightTitle: "Bの場合",
        rightContent: "",
        leftSteps: [],
        rightSteps: [],
      },
      {
        id: "line-step-1",
        type: "branch",
        content: "",
        leftTitle: "LINEのみの場合",
        leftContent: "LINEアプリの更新を確認。\n更新があれば更新する。",
        rightTitle: "電話アプリ全般の場合",
        rightContent: "端末電源OFF→ON",
        leftSteps: [
          {
            id: "line-left-1",
            type: "normal",
            content: "端末電源OFF→ON",
            leftTitle: "Aの場合",
            leftContent: "",
            rightTitle: "Bの場合",
            rightContent: "",
            leftSteps: [],
            rightSteps: [],
          },
          {
            id: "line-left-2",
            type: "normal",
            content: "LINEアプリ　ストレージ消去\n※BU後、支援者立ち会いの上実施",
            leftTitle: "Aの場合",
            leftContent: "",
            rightTitle: "Bの場合",
            rightContent: "",
            leftSteps: [],
            rightSteps: [],
          },
          {
            id: "line-left-3",
            type: "normal",
            content: "LINEのヘルプ、障害情報確認",
            leftTitle: "Aの場合",
            leftContent: "",
            rightTitle: "Bの場合",
            rightContent: "",
            leftSteps: [],
            rightSteps: [],
          },
          {
            id: "line-left-4",
            type: "normal",
            content: "LINE問い合わせ",
            leftTitle: "Aの場合",
            leftContent: "",
            rightTitle: "Bの場合",
            rightContent: "",
            leftSteps: [],
            rightSteps: [],
          },
        ],
        rightSteps: [
          {
            id: "line-right-1",
            type: "normal",
            content: "保護シート等で物理的に塞いでないか確認。",
            leftTitle: "Aの場合",
            leftContent: "",
            rightTitle: "Bの場合",
            rightContent: "",
            leftSteps: [],
            rightSteps: [],
          },
          {
            id: "line-right-2",
            type: "normal",
            content: "Bluetoothに繋がっていないか確認。",
            leftTitle: "Aの場合",
            leftContent: "",
            rightTitle: "Bの場合",
            rightContent: "",
            leftSteps: [],
            rightSteps: [],
          },
          {
            id: "line-right-3",
            type: "normal",
            content: "①セーフモード\n②ソフトウェアアップデート\n③アプリ設定リセット\n上記3点を提案",
            leftTitle: "Aの場合",
            leftContent: "",
            rightTitle: "Bの場合",
            rightContent: "",
            leftSteps: [],
            rightSteps: [],
          },
          {
            id: "line-right-4",
            type: "normal",
            content: "点検誘導",
            leftTitle: "Aの場合",
            leftContent: "",
            rightTitle: "Bの場合",
            rightContent: "",
            leftSteps: [],
            rightSteps: [],
          },
        ],
      },
    ],
  },
  {
    id: "sample-app-limit",
    title: "電話帳アプリの登録件数上限",
    service: "アプリ",
    question: "電話帳アプリの登録件数上限を知りたい。",
    rootCause: "実機検証結果",
    mode: "normal",
    solution: "XXX件",
    useCount: 2,
    useHistory: [new Date().toISOString(), new Date().toISOString()],
    createdAt: "2026/5/25 6:22:51",
    steps: [createStep()],
  },
  {
    id: "sample-third-login",
    title: "他社のアプリ「〇〇」のログイン不可",
    service: "3rd",
    question: "他社のアプリ「〇〇」にログインするための認証コードが届かない",
    rootCause: "社内資料〇〇参照",
    mode: "roadmap",
    solution: "",
    useCount: 0,
    useHistory: [],
    createdAt: "2026/5/25 6:32:28",
    steps: [
      {
        id: "third-step-0",
        type: "normal",
        content: "SMS拒否設定を確認",
        leftTitle: "Aの場合",
        leftContent: "",
        rightTitle: "Bの場合",
        rightContent: "",
        leftSteps: [],
        rightSteps: [],
      },
      {
        id: "third-step-1",
        type: "branch",
        content: "",
        leftTitle: "拒否されていた場合",
        leftContent: "解除して試す",
        rightTitle: "拒否されていない場合",
        rightContent: "端末再起動",
        leftSteps: [
          {
            id: "third-left-1",
            type: "normal",
            content: "端末再起動",
            leftTitle: "Aの場合",
            leftContent: "",
            rightTitle: "Bの場合",
            rightContent: "",
            leftSteps: [],
            rightSteps: [],
          },
          {
            id: "third-left-2",
            type: "normal",
            content: "通信系トラシュー",
            leftTitle: "Aの場合",
            leftContent: "",
            rightTitle: "Bの場合",
            rightContent: "",
            leftSteps: [],
            rightSteps: [],
          },
          {
            id: "third-left-3",
            type: "normal",
            content: "アプリのヘルプ・よくある質問をチェック",
            leftTitle: "Aの場合",
            leftContent: "",
            rightTitle: "Bの場合",
            rightContent: "",
            leftSteps: [],
            rightSteps: [],
          },
          {
            id: "third-left-4",
            type: "normal",
            content: "デベロッパー問い合わせ",
            leftTitle: "Aの場合",
            leftContent: "",
            rightTitle: "Bの場合",
            rightContent: "",
            leftSteps: [],
            rightSteps: [],
          },
        ],
        rightSteps: [
          {
            id: "third-right-1",
            type: "normal",
            content: "アプリのヘルプ・よくある質問をチェック",
            leftTitle: "Aの場合",
            leftContent: "",
            rightTitle: "Bの場合",
            rightContent: "",
            leftSteps: [],
            rightSteps: [],
          },
          {
            id: "third-right-2",
            type: "normal",
            content: "デベロッパー問い合わせ",
            leftTitle: "Aの場合",
            leftContent: "",
            rightTitle: "Bの場合",
            rightContent: "",
            leftSteps: [],
            rightSteps: [],
          },
        ],
      },
    ],
  },
];

function App() {
  const [page, setPage] = useState("top");
  const [posts, setPosts] = useState(() => {
    const savedPosts = localStorage.getItem("knowledge_posts");

    if (savedPosts) {
      const parsedPosts = JSON.parse(savedPosts);

      if (parsedPosts.length > 0) {
        return parsedPosts;
      }
    }

    return samplePosts;
  });
  const [form, setForm] = useState(emptyForm());
  const [selectedPost, setSelectedPost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [searchWord, setSearchWord] = useState("");
  const [selectedService, setSelectedService] = useState("すべて");

  useEffect(() => {
    localStorage.setItem("knowledge_posts", JSON.stringify(posts));
  }, [posts]);

  const updateForm = (key, value) => setForm({ ...form, [key]: value });

  const savePost = () => {
    if (!form.title.trim()) return alert("タイトルは必須です");
    if (!form.rootCause.trim()) return alert("根拠は必須です");

    if (editingPost) {
      const updatedPost = {
        ...form,
        id: editingPost.id,
        createdAt: editingPost.createdAt,
        useCount: editingPost.useCount || 0,
      };

      setPosts(posts.map((post) => post.id === editingPost.id ? updatedPost : post));
      setSelectedPost(updatedPost);
      setEditingPost(null);
    } else {
      const newPost = {
        ...form,
        id: crypto.randomUUID(),
        createdAt: new Date().toLocaleString(),
        useCount: 0,
      };

      setPosts([newPost, ...posts]);
    }

    setForm(emptyForm());
    setPage("top");
  };

  const deletePost = (id) => {
    if (!confirm("この投稿を削除しますか？")) return;
    setPosts(posts.filter((post) => post.id !== id));
    setPage("top");
  };

  const usePost = (id) => {
    if (!confirm("この情報をお客様対応に使用しましたか？")) return;

    const now = new Date().toISOString();

    const updatedPosts = posts.map((post) =>
      post.id === id
        ? {
            ...post,
            useCount: (post.useCount || 0) + 1,
            useHistory: [...(post.useHistory || []), now],
          }
        : post
    );

    setPosts(updatedPosts);

    setSelectedPost((current) =>
      current && current.id === id
        ? {
            ...current,
            useCount: (current.useCount || 0) + 1,
            useHistory: [...(current.useHistory || []), now],
          }
        : current
    );
  };

  const openDetail = (post) => {
    setSelectedPost(post);
    setPage("detail");
  };

  const filteredPosts = posts.filter((post) => {
    const words = searchWord.trim().split(/\s+/).filter(Boolean);
    const serviceMatch = selectedService === "すべて" || post.service === selectedService;

    const target = `
      ${post.service}
      ${post.title}
      ${post.question}
      ${post.solution}
      ${post.rootCause}
      ${JSON.stringify(post.steps)}
    `;

    const wordMatch = words.length === 0 || words.every((word) => target.includes(word));
    return serviceMatch && wordMatch;
  });

  const getRecentUseCount = (post) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return (post.useHistory || []).filter((usedAt) => {
      return new Date(usedAt) >= oneWeekAgo;
    }).length;
  };

  const getTrendLabel = (count) => {
    if (count >= 5) return "🔥入電激増";
    if (count >= 3) return "⚠️増加傾向";
    if (count >= 1) return "✅使用あり";
    return "🆕直近使用なし";
  };

  if (page === "top") {
    return (
      <div className="app">
        <Header />

        <div className="top-buttons">
          <button onClick={() => setPage("post")}>📝 投稿フォームを開く</button>
          <button onClick={() => setPage("search")}>🔍 検索フォームを開く</button>
        </div>

        <div className="top-grid">
          <section className="panel">
            <h2>🆕 最近投稿された情報</h2>
            <TitleList posts={posts.slice(0, 5)} openDetail={openDetail} />
          </section>

          <section className="panel">
            <h2>📈 使用回数ランキング</h2>
            <TitleList
              posts={[...posts]
                .sort((a, b) => getRecentUseCount(b) - getRecentUseCount(a))
                .slice(0, 5)}
              openDetail={openDetail}
              showCount
              getRecentUseCount={getRecentUseCount}
              getTrendLabel={getTrendLabel}
            />
          </section>
        </div>
      </div>
    );
  }

  if (page === "post") {
    return (
      <div className="app">
        <Header />
        <button className="back-button" onClick={() => setPage("top")}>
          ← TOPへ戻る
        </button>

        <h2>📝 投稿フォーム</h2>

        <div className="form-page">

          <label>関連サービス</label>

          <select value={form.service} onChange={(e) => updateForm("service", e.target.value)}>
            {serviceOptions.map((s) => <option key={s}>{s}</option>)}
          </select>

          <label>タイトル</label>
          <input value={form.title} onChange={(e) => updateForm("title", e.target.value)} />

          <label>問い合わせ内容</label>
          <textarea value={form.question} onChange={(e) => updateForm("question", e.target.value)} />

          <div className="mode-row">
            <label><input type="radio" checked={form.mode === "normal"} onChange={() => updateForm("mode", "normal")} /> 通常</label>
            <label><input type="radio" checked={form.mode === "roadmap"} onChange={() => updateForm("mode", "roadmap")} /> ロードマップ形式</label>
          </div>

          {form.mode === "normal" ? (
            <>
              <label>解決した方法</label>
              <textarea value={form.solution} onChange={(e) => updateForm("solution", e.target.value)} />
            </>
          ) : (
            <RoadmapEditor steps={form.steps} setSteps={(steps) => updateForm("steps", steps)} />
          )}

          <label>情報の根拠 ※必須</label>
          <textarea value={form.rootCause} onChange={(e) => updateForm("rootCause", e.target.value)} />
          <div className="card-buttons">
            <button className="primary-button" onClick={savePost}>投稿する</button>
            
            <button className="back-button" onClick={() => setPage("top")}>
              ← TOPへ戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (page === "search") {
    return (
      <div className="app">
        <Header />
        <button className="back-button" onClick={() => setPage("top")}>
          ← TOPへ戻る
        </button>

       <h2>🔍 検索フォーム</h2>

        <div className="form-page">
          <div className="search-controls">
            <input placeholder="検索ワード" value={searchWord} onChange={(e) => setSearchWord(e.target.value)} />

            <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
              <option>すべて</option>
              {serviceOptions.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <p>検索結果：{filteredPosts.length}件</p>
          <TitleList posts={filteredPosts} openDetail={openDetail} showCount />

          <button className="back-button" onClick={() => setPage("top")}>
            ← TOPへ戻る
          </button>
        </div>
      </div>
    );
  }

  if (page === "detail" && selectedPost) {
    return (
      <div className="app">
        <Header />
        <button className="back-button" onClick={() => setPage("top")}>← TOPへ戻る</button>

        <div className="detail-card">
          <h2>📌 {selectedPost.service}｜{selectedPost.title}</h2>
          <p className="meta">投稿日：{selectedPost.createdAt}｜使用回数：{selectedPost.useCount}回</p>

          <div className="detail-section">
            <h3>問い合わせ内容</h3>
            <p>{selectedPost.question}</p>
          </div>

          <div className="detail-section">
            <h3>解決方法・ロードマップ</h3>
            {selectedPost.mode === "roadmap" ? (
              <RoadmapView steps={selectedPost.steps} />
            ) : (
              <p>{selectedPost.solution}</p>
            )}
          </div>

          <div className="detail-section">
            <h3>根拠</h3>
            <p>{selectedPost.rootCause}</p>
          </div>
          <button className="back-button" onClick={() => setPage("top")}>
            ← TOPへ戻る
          </button>
          <div className="card-buttons">
            <button onClick={() => usePost(selectedPost.id)}>この情報を使用した</button>

            <button
              onClick={() => {
                setForm(selectedPost);
                setEditingPost(selectedPost);
                setPage("post");
              }}
            >
              編集
            </button>

            <button className="delete-button" onClick={() => deletePost(selectedPost.id)}>削除</button>
          </div>
        </div>
      </div>
    );
  }
}

function Header() {
  return (
    <>
      <h1>📚 誰でもロードマップナレッジ</h1>
      <p className="warning">🚨 根拠確認必須！ 根拠が公式資料にない場合は、必ず「可能性」や「推測」として伝えること！ 🚨</p>
    </>
  );
}

function TitleList({
  posts,
  openDetail,
  showCount = false,
  getRecentUseCount,
  getTrendLabel,
}) {
  if (posts.length === 0) return <p className="empty">まだ投稿はありません。</p>;

  return (
    <div className="card-list">
      {posts.map((post) => {
        const recentCount = getRecentUseCount
          ? getRecentUseCount(post)
          : post.useCount || 0;

        const trendLabel = getTrendLabel
          ? getTrendLabel(recentCount)
          : "";

        return (
          <div className="title-card" key={post.id} onClick={() => openDetail(post)}>
            <span>📌 {post.service}｜{post.title}</span>

            {showCount && (
              <span className="count">
                {trendLabel}　直近7日：{recentCount}回
              </span>
            )}
          </div>
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

  const deleteStep = (index) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

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
        <textarea placeholder="対応内容" value={step.content} onChange={(e) => change("content", e.target.value)} />
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
      <input className="branch-title" value={step[titleKey]} onChange={(e) => change(titleKey, e.target.value)} />

      <textarea
        placeholder={`${step[titleKey]}の内容`}
        value={step[contentKey]}
        onChange={(e) => change(contentKey, e.target.value)}
      />

      <RoadmapEditor steps={childSteps} setSteps={setChildSteps} />
    </div>
  );
}

function RoadmapView({ steps }) {
  const nodes = [];
  const edges = [];
  let count = 0;

  const addNodes = (items, parentId = null, x = 400, y = 0) => {
    let previousId = parentId;

    items.forEach((step, index) => {
      const currentY = y + index * 240;

      if (step.type === "normal") {
        const id = step.id || `node-${count++}`;

        nodes.push({
          id,
          position: { x, y: currentY },
          data: { label: step.content || "未入力" },
          style: nodeStyle,
        });

        if (previousId) {
          edges.push({
            id: `${previousId}-${id}`,
            source: previousId,
            target: id,
          });
        }

        previousId = id;
        return;
      }

      if (step.type === "branch") {
        const leftId = `${step.id}-left`;
        const rightId = `${step.id}-right`;

        nodes.push({
          id: leftId,
          position: { x: x - 280, y: currentY },
          data: { label: step.leftContent || "未入力" },
          style: nodeStyle,
        });

        nodes.push({
          id: rightId,
          position: { x: x + 280, y: currentY },
          data: { label: step.rightContent || "未入力" },
          style: nodeStyle,
        });

        if (previousId) {
          edges.push({
            id: `${previousId}-${leftId}`,
            source: previousId,
            target: leftId,
            label: step.leftTitle,
          });

          edges.push({
            id: `${previousId}-${rightId}`,
            source: previousId,
            target: rightId,
            label: step.rightTitle,
          });
        }

        addNodes(step.leftSteps || [], leftId, x - 280, currentY + 260);
        addNodes(step.rightSteps || [], rightId, x + 280, currentY + 260);

        previousId = null;
      }
    });
  };

  addNodes(steps, null, 400, 120);

  return (
    <div className="flow-box">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{
          padding: 0.25,
        }}
        colorMode="dark"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
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