import React, { ReactNode } from "react";

interface TableProps {
  children: ReactNode;
}

export const Table: React.FC<TableProps> = ({ children }) => (
  <table className="w-full border-collapse">{children}</table>
);

export const TableHeader: React.FC<TableProps> = ({ children }) => (
  <thead>{children}</thead>
);

export const TableBody: React.FC<TableProps> = ({ children }) => (
  <tbody>{children}</tbody>
);

export const TableRow: React.FC<TableProps> = ({ children }) => (
  <tr>{children}</tr>
);

export const TableHead: React.FC<TableProps> = ({ children }) => (
  <th className="border p-2 text-left font-bold">{children}</th>
);

export const TableCell: React.FC<TableProps> = ({ children }) => (
  <td className="border p-2">{children}</td>
);
