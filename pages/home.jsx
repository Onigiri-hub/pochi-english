import { useRouter } from "next/router";
import Navigation from "../components/Navigation";


export default function Home() {
  const router = useRouter();

  return (
    <div className="homeContainer">
      <div className="homeContent">

        <h1 className="homeTitle">Pochi</h1>

        <div className="homeButtons">

          <button
            className="homeBtn"
            onClick={() => router.push("/unitList")}
          >
            <img src="/images/illustrations/pochi_grammar.png" alt="英文法学習" />
            英文法学習
          </button>

          <button
            className="homeBtn disabled"
            onClick={() => {}}
          >
            <img src="/images/illustrations/pochi_vocabulary.png" alt="英単語学習" />
            英単語学習
          </button>

        </div>
      </div>
      <Navigation />
    </div>
  );
}