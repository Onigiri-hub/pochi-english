import { useRouter } from "next/router";
import Navigation from "../components/Navigation";
import { useState, useRef } from "react";

export default function Home() {
  const router = useRouter();
  const videoRef = useRef(null)


  function playWan() {
    const audio = new Audio("/sound/wan.mp3")
    audio.play()
    videoRef.current.currentTime = 0
    videoRef.current.play()
  }

  return (
    <div className="homeContainer">
      <div className="homeContent">

        <video
          ref={videoRef}
          src="/animations/wan.mp4"
          muted
          playsInline
          className="homePochi"
          onClick={playWan}
          style={{ cursor: "pointer" }}
          data-no-sound  
        />
        
        {/*
        <img src="/images/illustrations/pochi.png" className="homePochi" />   
        */}

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