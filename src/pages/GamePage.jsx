import { useParams, Link } from 'react-router-dom';
import { useRef, useCallback, useState } from 'react';
import { Button, Tag, Result } from 'antd';
import { FullscreenOutlined } from '@ant-design/icons';
import { getGameById, getDisplayCoverPath, games } from '../data/games';
import RecList from '../components/RecList';
import styles from './GamePage.module.css';

function GamePage() {
  const { id } = useParams();
  const game = getGameById(id);
  const frameWrapRef = useRef(null);
  const [cssFull, setCssFull] = useState(false);

  const handleFullscreen = useCallback(() => {
    const el = frameWrapRef.current;
    if (!el) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen().catch(() => {
        // CSS fallback
        setCssFull((prev) => !prev);
      });
    }
  }, []);

  // Task 6.5: game not found
  if (!game) {
    return (
      <div>
        <div className={styles.pageHeader}>
          <Link to="/" className={styles.backLink}>← 返回</Link>
        </div>
        <div style={{ paddingTop: 80 }}>
          <Result
            status="404"
            title="游戏未找到"
            subTitle="该游戏不存在或已被移除"
            extra={<Link to="/"><Button type="primary">返回首页</Button></Link>}
          />
        </div>
      </div>
    );
  }

  const recGames = games.filter((g) => g.id !== id);

  return (
    <div>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <Link to="/" className={styles.backLink}>← 返回</Link>
        <span className={styles.gameTitle}>{game.name}</span>
      </div>

      {/* Page body: main + sidebar */}
      <div className={styles.pageBody}>
        <div className={styles.mainCol}>
          {/* Task 6.1: iframe game area */}
          <div
            ref={frameWrapRef}
            className={`${styles.frameWrap}${cssFull ? ` ${styles.fullscreen}` : ''}`}
          >
            <iframe
              src={`/games/${id}/index.html`}
              title={game.name}
              allowFullScreen
            />
          </div>

          {/* Toolbar with fullscreen button (Task 6.3) */}
          <div className={styles.toolbar}>
            <span className={styles.toolbarName}>{game.name}</span>
            <Button
              type="text"
              icon={<FullscreenOutlined />}
              onClick={handleFullscreen}
              title="全屏"
              style={{ color: '#888' }}
            />
          </div>

          {/* Task 6.2: game info section */}
          <div className={styles.infoSection}>
            <div className={styles.infoHeader}>
              <img
                className={styles.infoCover}
                src={getDisplayCoverPath(game)}
                alt={game.name}
              />
              <div className={styles.infoTitle}>
                <h2>{game.name}</h2>
                <Tag>{game.categoryLabel}</Tag>
              </div>
            </div>
            <div className={styles.ratingPlaceholder}>
              <span className={styles.ratingStars}>☆☆☆☆☆</span>
              <span>暂无评分</span>
            </div>
            <div className={styles.gameDesc}>{game.desc || '暂无介绍'}</div>
          </div>
        </div>

        {/* Sidebar: recommended games (Task 6.4 + 6.6) */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarTitle}>🎮 推荐游戏</div>
          <RecList games={recGames} />
        </div>
      </div>
    </div>
  );
}

export default GamePage;
