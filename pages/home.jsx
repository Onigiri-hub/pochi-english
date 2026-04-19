import { useRouter } from "next/router";
import Navigation from "../components/Navigation";


export default function Home() {
  const router = useRouter();

  return (
    <div className="homeContainer">
      <div className="homeContent">
        <img src="/images/illustrations/pochi.png" className="homePochi" />   

        <h1 className="homeTitle"></h1>

        <div className="homeButtons">

          {/*
          <button
            className="homeBtn"
            onClick={() => router.push("/unitList")}
          >
            <img src="/images/illustrations/pochi_grammar.png" alt="英文法学習" />
            
          </button>

          <button
            className="homeBtn disabled"
            onClick={() => {}}
          >
            <img src="/images/illustrations/pochi_vocabulary.png" alt="英単語学習" />
            
          </button>
          */}


          <img
            src="/images/illustrations/pochi_grammar.png"
            alt="英文法学習"
            className="homeBtnImg"
            onClick={() => router.push("/unitList")}
          />

          <img
            src="/images/illustrations/pochi_vocabulary.png"
            alt="英単語学習"
            className="homeBtnImg disabled"
          />



        </div>
      </div>
      <Navigation />
    </div>
  );
}