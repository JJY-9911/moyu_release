import { Card } from 'antd';
import { Link } from 'react-router-dom';
import { getDisplayCoverPath } from '../data/games';
import styles from './GameCard.module.css';

function GameCard({ game }) {
  return (
    <Link to={`/game/${game.id}`} className={styles.cardLink}>
      <Card
        className={styles.card}
        cover={<img className={styles.thumb} alt={game.name} src={getDisplayCoverPath(game)} />}
        bordered={false}
        hoverable={false}
      >
        <div className={styles.info}>
          <div className={styles.name}>
            {game.name}
            {game.hot && <span className={styles.hot}>🔥 热门</span>}
          </div>
          <span className={styles.tag}>{game.categoryLabel}</span>
        </div>
      </Card>
    </Link>
  );
}

export default GameCard;
