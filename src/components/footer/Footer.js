import React from "react";
import piLogo from "../header/pi-network.svg"
import styles from "./Footer.module.css";

const date = new Date();
const year = date.getFullYear();

const Footer = () => {
  return <div className={styles.footer}>&copy; {year} All Rights Reserved.
  <div className={styles.piblock}>
      {/* <img className={styles.pilo} src={"https://res.cloudinary.com/do8lyndou/image/upload/v1733736990/Pi-button_dbwp3k.svg"} alt="pilogo"/> */}
      <img className={styles.pilo} src={piLogo} alt="pilogo"/>
      <h6>Available soon</h6>
    </div>
  </div>;
};

export default Footer;
