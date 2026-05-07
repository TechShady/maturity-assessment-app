import React from "react";
import { useCustomerName } from "../CustomerNameContext";
import "../styles/banner.css";

export const CustomerBanner = () => {
  const { customerName } = useCustomerName();
  if (!customerName) return null;
  return (
    <div className="customer-banner">
      <span className="customer-banner-name">{customerName}</span>
    </div>
  );
};
