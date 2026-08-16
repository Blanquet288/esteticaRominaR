import logoRomina from '../../assets/RominaLetras.png';
import './LoadingScreen.css';

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <img src={logoRomina} alt="Estética Romina" className="loading-logo" />
    </div>
  );
}
