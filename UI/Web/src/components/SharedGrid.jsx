import { Children } from 'react';

function resolveColumns(columns = 4) {
  if (columns === 1) return 'col-12';
  if (columns === 2) return 'col-12 col-md-6';
  if (columns === 3) return 'col-12 col-md-6 col-xl-4';
  if (columns === 5) return 'col-12 col-sm-6 col-xl';
  return 'col-12 col-sm-6 col-xl-3';
}

export default function SharedGrid({
  children,
  columns = 4,
  className = '',
  itemClassName = ''
}) {
  const columnClass = resolveColumns(columns);

  return (
    <div className={`row g-3 ${className}`.trim()}>
      {Children.toArray(children).map((child, index) => (
        <div key={index} className={`${columnClass} ${itemClassName}`.trim()}>
          {child}
        </div>
      ))}
    </div>
  );
}
