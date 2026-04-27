import { Tabs } from 'antd';
import styles from './CategoryTabs.module.css';

function CategoryTabs({ categories, selectedCategory, onSelect }) {
  const items = categories.map((cat) => ({
    key: cat.key,
    label: cat.label,
  }));

  return (
    <div className={styles.tabsWrap}>
      <Tabs
        activeKey={selectedCategory}
        items={items}
        onChange={onSelect}
        size="small"
      />
    </div>
  );
}

export default CategoryTabs;
