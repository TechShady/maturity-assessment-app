import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface CustomerNameContextType {
  customerName: string;
  setCustomerName: (name: string) => void;
}

const CustomerNameContext = createContext<CustomerNameContextType>({
  customerName: "",
  setCustomerName: () => {},
});

export const useCustomerName = () => useContext(CustomerNameContext);

export const CustomerNameProvider = ({ children }: { children: ReactNode }) => {
  const [customerName, setCustomerNameState] = useState(() =>
    localStorage.getItem("sre-customer-name") || ""
  );

  const setCustomerName = (name: string) => {
    setCustomerNameState(name);
    localStorage.setItem("sre-customer-name", name);
  };

  return (
    <CustomerNameContext.Provider value={{ customerName, setCustomerName }}>
      {children}
    </CustomerNameContext.Provider>
  );
};
