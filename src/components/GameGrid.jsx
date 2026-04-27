import { Row, Col } from 'antd';
import GameCard from './GameCard';
import styles from './GameGrid.module.css';

function GameGrid({ games }) {
  return (
    <div className={styles.grid}>
      <Row gutter={[20, 20]}>
        {games.map((game) => (
          <Col key={game.id} xs={24} sm={12} md={8} lg={6}>
            <GameCard game={game} />
          </Col>
        ))}
      </Row>
    </div>
  );
}

export default GameGrid;
