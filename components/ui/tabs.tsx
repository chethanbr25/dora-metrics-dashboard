import React, { createContext, useState, useContext, ReactNode } from "react";

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps {
  children: ReactNode;
  defaultValue: string;
}

export const Tabs: React.FC<TabsProps> = ({ children, defaultValue }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: ReactNode;
}

export const TabsList: React.FC<TabsListProps> = ({ children }) => {
  return <div className="tabs-list">{children}</div>;
};

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
}) => {
  const context = useContext(TabsContext);
  if (!context)
    throw new Error("TabsTrigger must be used within a Tabs component");
  const { activeTab, setActiveTab } = context;

  return (
    <button
      className={`tabs-trigger ${activeTab === value ? "active" : ""}`}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: ReactNode;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
}) => {
  const context = useContext(TabsContext);
  if (!context)
    throw new Error("TabsContent must be used within a Tabs component");
  const { activeTab } = context;

  if (activeTab !== value) return null;

  return <div className="tabs-content">{children}</div>;
};

export default Tabs;
