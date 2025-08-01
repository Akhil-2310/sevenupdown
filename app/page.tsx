"use client";

import { useSignerStatus } from "@account-kit/react";
import UserInfoCard from "./components/user-info-card";
import LoginCard from "./components/login-card";
import Header from "./components/header";
import LearnMore from "./components/learn-more";
import SevenUpDownGame from "./components/sevenupdowngame";

export default function Home() {
  const signerStatus = useSignerStatus();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />
      <div className="bg-bg-main bg-cover bg-center bg-no-repeat h-[calc(100vh-4rem)]">
        <main className="container mx-auto px-4 py-8 h-full">
          {signerStatus.isConnected ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
              {/* User Info Card - Left Side */}
              <div className="lg:col-span-1 flex flex-col">
                <UserInfoCard />
              </div>
              
              {/* Game - Center/Right Side */}
              <div className="lg:col-span-3 flex items-center justify-center">
                <SevenUpDownGame />
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-full pb-[4rem]">
              <LoginCard />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
