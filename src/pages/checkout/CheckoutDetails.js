import { useState } from "react";
import { auth } from "../../firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  REMOVE_ACTIVE_USER,
  SET_ACTIVE_USER,
} from "../../redux/slice/authSlice";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import Card from "../../components/card/Card";
import CheckoutSummary from "../../components/checkoutSummary/CheckoutSummary.js";
import {
  SAVE_BILLING_ADDRESS,
  SAVE_SHIPPING_ADDRESS,
} from "../../redux/slice/checkoutSlice";
import styles from "./CheckoutDetails.module.css";
import piLogo from "./pi-network.svg"

const initialAddressState = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  phone: "",
};

/*
<input type="hidden" name="cmd" value="start">
<input type="hidden" name="rN" value="Jack Laprune">
<input type="hidden" name="rT" value="6xxxxxxxx">
<input type="hidden" name="rH" value="XXXXXXXXX">
<input type="hidden" name="rI" value="XXXX">
<input type="hidden" name="rMt" value="500">
<input type="hidden" name="rDvs" value="XAF">
<input type="hidden" name="source" value="my Shop Name">
<input type="hidden" name="endPage" value="http://www.votre-site.com/success.php">
<input type="hidden" name="notifyPage" value="http://www.votre-site.com">
<input type="hidden" name="cancelPage" value="http://www.votre-site.com">
<input type="submit" value="Valider"> */

/* cmd

Valeur = « start »
Cette Valeur est à ne pas changer et elle est
Obligatoire

rN nom de votre client qui effectue le paiement. c'est facultatif.

rT Numéro Téléphone du client qui effectue le paiement (Obligatoire)

rE Adresse email du client qui effectue le paiement. c'est facultatif.

rH Votre Code-marchand qui est disponible dans la page
« profil » de votre compte DOHONE (Obligatoire) ou
que vous avez reçu par mail.

rI Le numéro de votre commande. Si votre système ne
gère pas de numéro de commande, vous pouvez enlever ce champs. c'est facultatif.

rMt

Montant TOTAL des achats (Obligatoire). C‟est le
montant qui devra être payé par votre client. Par
défaut la dévise de ce montant est l'euro, Sauf si vous

précisez une autre devise sous le paramètre 'rDvs' ci-
après.

rDvs

La devise correspondante au montant que vous avez
donné. Ce paramètre est facultatif. Dans le cas où vous
ne précisez pas ce paramètre, la devise est EUR. Vous
avez le choix entre 3 devises uniquement : EUR, XAF,
USD

rOnly

Ceci est optionnel. Si vous souhaitez que votre API
n‟affiche que certains opérateurs, vous pouvez préciser
ces opérateurs ici. 1=MTN, 2=Orange, 3=Express
Union, 10=Dohone-Account, 5=VISA/MASTERCARD,
17=YUP, 18=Yoomee, 20=Gimacpay (BANK-FASTER).
Vous pouvez préciser plusieurs, séparés par la virgule.
Exemple : « 1, 2, 3, 17 »
Dans le cas où vous choisissez juste un seul opérateur,

le téléphone de paiement du client deviendra non-
modifiable et sera obligatoirement le téléphone fourni

sous le paramètre « rT ».
rLocale le choix de la langue. « fr » ou « en »
source Le nom commercial de votre site (Obligatoire)
endPage Adresse de redirection en cas de SUCCESS de paiement (Obligatoire)

notifyPage Adresse de notification automatique de votre site en cas de succès de paiement (facultatif)
cancelPage Adresse de redirection en cas d‟Annulation de
paiement par le client (Obligatoire)

logo une adresse url menant au logo de votre site si vous
voulez voir apparaitre ce logo pendant le paiement
(Facultatif)

motif le motif est facultatif. S‟il est précisé, il sera inscrit dans
votre historique DOHONE (version excel). Ceci peut
être important pour votre comptabilité.

numberNotifs Nombre de fois/tentatives de notification de votre
serveur par DOHONE, vers votre notifyPage. Default =
1. Max = 5.
DOHONE notifiera votre serveur ce nombre de fois,
pour chaque transaction. Ce paramètre est facultatif.

rUserId Dans des environnements critiques de sécurité des
payeurs contre la Web-Criminalité, ou dans des
environnements où vous contactez continuellement
DOHONE via la même session http (pour tout client
confondu), Ce paramètre permet à DOHONE de mieux
gérer vos clients. Vous y fournissez l‟identifiant du compte de votre client dans votre système. Ce paramètre est facultatif.*/

const CheckoutDetails = () => {
  const [shippingAddress, setShippingAddress] = useState({
    ...initialAddressState,
  });
  const [billingAddress, setBillingAddress] = useState({
    ...initialAddressState,
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleShipping = (e) => {
    const { name, value } = e.target;
    setShippingAddress({
      ...shippingAddress,
      [name]: value,
    });
  };

  const handleBilling = (e) => {
    const { name, value } = e.target;
    setBillingAddress({
      ...billingAddress,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(SAVE_SHIPPING_ADDRESS(shippingAddress));
    dispatch(SAVE_BILLING_ADDRESS(billingAddress));
    navigate("/checkout");
  };
  const handleSubmitPi = (e) => {
    e.preventDefault();
    dispatch(SAVE_SHIPPING_ADDRESS(shippingAddress));
    dispatch(SAVE_BILLING_ADDRESS(billingAddress));
    navigate("/checkoutPi");
  };


  return (
    <section>
      <div className={`container ${styles.checkout}`}>
        <h2>Checkout Details</h2>
        <form action="https://www.my-dohone.com/dohone/pay" onSubmit={handleSubmit} >
          <div>
            <Card cardClass={styles.card}>
              {/* <h3>Coordonnes</h3> */}
              {/* <label>Recipient Name</label>
              <input
                type="text"
                required
                name="name"
                value="start"
                readOnly
                onChange={(e) => handleShipping(e)}
              /> */}
              <input type="hidden" name="cmd" value="start"/>
              <input type="hidden" name="rN" value=""/>
              <input type="hidden" name="rT" value="6xxxxxxxx"/>
              <input type="hidden" name="rH" value="XXXXXXXXX"/>
              <input type="hidden" name="rI" value="XXXX"/>
              <input type="hidden" name="rMt" value="500"/>
              <input type="hidden" name="rDvs" value="XAF"/>
              <input type="hidden" name="source" value="Etralishop"/>
              <input type="hidden" name="endPage" value="http://www.votre-site.com/success.php"/>
              <input type="hidden" name="notifyPage" value="http://www.votre-site.com"/>
              <input type="hidden" name="cancelPage" value="http://www.votre-site.com"/>
              <button type="submit" value="valider" className="--btn --btn-primary">
                Proceed To Checkout
              </button>
              </Card>
          </div>
          <div>
            <Card cardClass={styles.card}>
              <CheckoutSummary />
            </Card>
          </div>
        </form>
        <br/>
        {/*pi network form*/}
        <form action="*" onSubmit={handleSubmitPi} >
          <div>
              <input type="hidden" name="cmd" value="start"/>
              <input type="hidden" name="rN" value=""/>
              <input type="hidden" name="rT" value="6xxxxxxxx"/>
              <input type="hidden" name="rH" value="XXXXXXXXX"/>
              <input type="hidden" name="rI" value="XXXX"/>
              <input type="hidden" name="rMt" value="500"/>
              <input type="hidden" name="rDvs" value="XAF"/>
              <input type="hidden" name="source" value="Etralishop"/>
              <input type="hidden" name="endPage" value="http://www.votre-site.com/success.php"/>
              <input type="hidden" name="notifyPage" value="http://www.votre-site.com"/>
              <input type="hidden" name="cancelPage" value="http://www.votre-site.com"/>
              <button type="submit" value="valider" className="--btn --pibtn">
                {/* Pi MAINNET Checkout <img className={styles.pilo} src={"https://res.cloudinary.com/do8lyndou/image/upload/v1733736990/Pi-button_dbwp3k.svg"} alt="pilogo"/> */}
                Pi MAINNET Checkout <img className={styles.pilo} src={piLogo} alt="pilogo"/>
              </button>
          </div>
        </form>
        {/*Pi Network form End*/}
      </div>
    </section>
  );
};

export default CheckoutDetails;
