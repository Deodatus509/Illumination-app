const fs = require('fs');
const code = fs.readFileSync('src/pages/SanctumMeditationDetail.tsx', 'utf8');

const startStr = "if (activeTab === 'live') {";
const endStr = "  return (\n    <div className=\"min-h-screen bg-obsidian pb-20\">";

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx === -1 || endIdx === -1) {
    console.log("Could not find boundaries");
    process.exit(1);
}

const newLiveBlock = `  if (activeTab === 'live') {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans h-[100dvh] overflow-hidden text-zinc-200">
        
        {/* HEADER */}
        <div className="flex-none h-16 px-4 md:px-6 bg-[#050505] border-b border-white/5 flex items-center justify-between">
          <button onClick={() => setActiveTab('overview')} className="text-zinc-400 hover:text-white transition-colors flex items-center">
            <ArrowLeft className="w-5 h-5 mr-3" />
            <span className="hidden sm:inline font-bold uppercase tracking-widest text-[11px]">Quitter</span>
          </button>

          <div className="flex items-center gap-4">
            {(isBroadcasting || activeLive) ? (
              <div className="flex items-center gap-3 bg-red-600/10 border border-red-500/20 px-4 py-1.5 rounded-full">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Live</span>
                <span className="text-[11px] text-white/50 border-l border-white/10 pl-3 flex items-center gap-1.5 font-bold"><Users size={12}/> {members.length + 12}</span>
              </div>
            ) : (
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">Studio Fermé</span>
            )}
          </div>

          <div>
             {canManage && !isBroadcasting && (
               <button onClick={() => setShowAddModal('live')} className="px-4 py-2 bg-white/5 text-white border border-white/10 rounded-xl text-[11px] uppercase tracking-widest font-bold flex items-center gap-2 hover:bg-white/10 transition-all">
                 <Plus size={14} /> <span className="hidden sm:inline">Programmer</span>
               </button>
             )}
          </div>
        </div>

        {/* MAIN STUDIO AREA */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          
          {/* LEFT: PLAYER STAGE */}
          <div className="flex-[3] relative flex flex-col bg-black min-h-0 lg:border-r border-white/5 group">
            
            {/* The Video Canvas */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
               {isBroadcasting ? (
                  <video 
                    ref={broadcastPreviewRef} 
                    autoPlay playsInline muted 
                    className={\`w-full h-full object-cover transition-opacity duration-300 \${isVideoOff ? 'opacity-0' : 'opacity-100'}\`}
                  />
               ) : activeLive ? (
                  <div className="w-full h-full relative flex items-center justify-center bg-zinc-900 border border-white/5">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-30 mix-blend-luminosity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/30" />
                    
                    <div className="z-10 text-center p-6 mt-10">
                      <div className="w-24 h-24 bg-yellow-500/10 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.15)] relative">
                        <div className="absolute inset-0 border border-yellow-500/50 rounded-full animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                        <Play className="w-10 h-10 text-yellow-500 ml-2" />
                      </div>
                      <h2 className="text-3xl lg:text-5xl font-serif text-white mb-4 tracking-wide shadow-black drop-shadow-xl">{activeLive.title}</h2>
                      <p className="text-yellow-500/90 uppercase tracking-[0.3em] pl-2 text-[10px] lg:text-[11px] font-bold drop-shadow-md">Réception du signal...</p>
                    </div>
                  </div>
               ) : (
                  <div className="text-center text-zinc-600">
                    <Video className="w-24 h-24 mx-auto mb-6 opacity-20" />
                    <p className="font-serif italic text-2xl tracking-wide">Le Sanctuaire est fermé</p>
                  </div>
               )}

               {/* Video Overlay Info (Top Left & Network) */}
               {(isBroadcasting || activeLive) && (
                 <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="bg-black/40 backdrop-blur-md px-5 py-3 rounded-[1.25rem] border border-white/10 shadow-2xl flex flex-col items-start">
                       <h2 className="text-xl font-serif text-white drop-shadow-md max-w-sm truncate">{activeLive?.title || "Session Libre"}</h2>
                       <p className="text-[10px] text-yellow-500/80 mt-1 tracking-widest uppercase font-bold">Animée par {userProfile?.displayName || "Le Guide"}</p>
                    </div>
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 shadow-2xl">
                       <Activity size={14} className="text-green-500" />
                       <span className="text-[9px] text-zinc-300 font-bold uppercase tracking-widest">HD</span>
                    </div>
                 </div>
               )}

               {/* Camera off placeholder */}
               {isVideoOff && isBroadcasting && (
                 <div className="absolute inset-0 bg-[#070707] flex flex-col items-center justify-center z-10 transition-all">
                    <CameraOff className="w-24 h-24 text-zinc-800 mb-6" />
                    <p className="font-serif text-white/30 text-2xl italic tracking-wide">Flux visuel coupé</p>
                 </div>
               )}

               {/* Floating Reactions Canvas */}
                <div className="absolute inset-x-0 bottom-24 top-0 pointer-events-none z-30 overflow-hidden">
                  {floatingReactions.map((reaction) => (
                    <motion.div
                      key={reaction.id}
                      initial={{ opacity: 0, y: 100, x: 0, scale: 0.5 }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        y: -400 - Math.random() * 200,
                        x: (Math.random() - 0.5) * 150,
                        scale: [0.5, 1.8, 1.3, 1]
                      }}
                      transition={{ duration: 4 + Math.random() * 2, ease: 'easeOut' }}
                      className="absolute bottom-10 right-[15%] lg:right-[20%] text-5xl lg:text-6xl drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                    >
                      {reaction.emoji}
                    </motion.div>
                  ))}
                </div>
            </div>

            {/* FLOATING CONTROLS PANEL */}
            <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 md:gap-4 bg-[#111]/80 hover:bg-[#111]/90 backdrop-blur-2xl border border-white/10 p-2 md:p-3 rounded-[2rem] transition-all z-40 shadow-[0_30px_60px_rgba(0,0,0,0.6)] opacity-100 lg:opacity-0 lg:group-hover:opacity-100 duration-500">
              
              {canManage && activeLive && !isBroadcasting ? (
                 <button onClick={startBroadcast} className="bg-white hover:bg-zinc-200 text-black px-6 py-3.5 md:py-4 rounded-[1.5rem] font-bold text-[11px] tracking-widest uppercase transition-all shadow-xl flex items-center gap-3">
                    <Video size={18} /> Diffuser le signal
                 </button>
              ) : isBroadcasting ? (
                 <>
                   <button onClick={toggleMute} className={\`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full transition-all \${isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/10'}\`}>
                     {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                   </button>
                   <button onClick={toggleVideo} className={\`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full transition-all \${isVideoOff ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/10'}\`}>
                     {isVideoOff ? <CameraOff size={22} /> : <Video size={22} />}
                   </button>
                   <div className="w-px h-8 bg-white/10 mx-1 md:mx-2" />
                   <button onClick={stopBroadcast} className="bg-red-600 hover:bg-red-500 text-white w-12 h-12 md:w-auto md:px-6 md:py-4 rounded-full md:rounded-[1.5rem] font-bold text-[11px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                     <LogOut size={20} className="md:hidden" />
                     <span className="hidden md:inline">Terminer</span>
                   </button>
                 </>
              ) : !canManage && activeLive ? (
                 <button className="bg-zinc-800 text-zinc-500 px-6 py-3.5 md:py-4 rounded-[1.5rem] font-bold text-[11px] tracking-widest uppercase transition-all flex items-center gap-3 cursor-not-allowed border border-white/5">
                    <Activity size={18} /> Signal distant
                 </button>
              ) : null}

              {/* Interaction for Spectators */}
              {activeLive && !canManage && (
                <button onClick={() => alert("Le levé de main sera géré dans la mise à jour communautaire suivante.")} className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all ml-1" title="S'exprimer">
                  ✋
                </button>
              )}
            </div>
          </div>

          {/* RIGHT/BOTTOM: CHAT & INTERACTION AREA */}
          <div className="flex-[2] lg:max-w-[400px] xl:max-w-[450px] flex-none h-[50vh] lg:h-full flex flex-col bg-[#050505] z-40 border-t lg:border-t-0 border-white/5 relative">
             
             {/* Tab Bar */}
             <div className="flex border-b border-white/5 bg-[#080808]">
                {[
                  { id: 'chat', label: 'Chat' },
                  { id: 'qa', label: 'Q&A' },
                  { id: 'schedule', label: 'A venir' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setLiveInteractionTab(tab.id as 'chat' | 'qa' | 'schedule')}
                    className={\`flex-1 py-4.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 \${
                      liveInteractionTab === tab.id ? 'text-yellow-500 border-b-2 border-yellow-500 bg-white/[0.02]' : 'text-zinc-500 hover:text-white hover:bg-white/[0.02] border-b-2 border-transparent'
                    }\`}
                  >
                    {tab.id === 'qa' && <HelpCircle size={14} className={liveInteractionTab === 'qa' ? 'text-yellow-500' : 'text-zinc-600'} />}
                    {tab.label}
                  </button>
                ))}
             </div>

             {/* Dynamic Content */}
             <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 scrollbar-hide flex flex-col-reverse bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-repeat opacity-95">
               {liveInteractionTab === 'chat' && (
                 <>
                   {messages.filter(m => m.type !== 'question').length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center pb-12 opacity-50">
                       <MessageSquare className="w-16 h-16 text-zinc-800 mb-6" />
                       <p className="text-zinc-500 font-serif text-lg tracking-wide italic">Le Sanctuaire est silencieux.</p>
                     </div>
                   ) : (
                     messages.filter(m => m.type !== 'question').map((msg) => {
                       const isMine = msg.sender_id === currentUser?.uid;
                       const isMentor = msg.sender_role === 'admin' || msg.sender_role === 'expert' || msg.sender_role === 'supporteur';
                       
                       const timeString = msg.created_at?.toDate 
                         ? new Date(msg.created_at.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                         : '';

                       return isMentor && !isMine ? (
                         <div key={msg.id} className="flex flex-col items-start space-y-1.5 max-w-[90%] mt-6">
                           <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest ml-4 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">{msg.userName || "Le Guide"}</span>
                           <div className="relative p-4 md:p-5 rounded-[1.5rem] rounded-tl-sm bg-white/5 border border-yellow-600/30 backdrop-blur-lg shadow-lg shadow-yellow-600/5">
                             <p className="text-sm md:text-[15px] text-white leading-relaxed">{msg.message}</p>
                             {timeString && <span className="block text-[9px] text-zinc-500 mt-2 text-right italic font-bold">{timeString}</span>}
                           </div>
                         </div>
                       ) : isMine ? (
                         <div key={msg.id} className="flex flex-col items-end space-y-1.5 ml-auto max-w-[90%] mt-6">
                           <div className="p-4 rounded-[1.5rem] rounded-tr-sm bg-zinc-800/80 border border-white/5 backdrop-blur-md">
                             <p className="text-sm text-zinc-200">{msg.message}</p>
                             {timeString && <span className="block text-[9px] text-zinc-500 mt-2 text-right italic font-bold">{timeString}</span>}
                           </div>
                         </div>
                       ) : (
                         <div key={msg.id} className="flex flex-col items-start space-y-1.5 max-w-[90%] mt-6">
                           <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">{msg.userName}</span>
                           <div className="p-4 rounded-[1.5rem] rounded-tl-sm bg-white/5 border border-white/5 backdrop-blur-md">
                             <p className="text-sm text-zinc-300">{msg.message}</p>
                             {timeString && <span className="block text-[9px] text-zinc-600 mt-2 text-right italic font-bold">{timeString}</span>}
                           </div>
                         </div>
                       );
                     })
                   )}
                 </>
               )}

               {liveInteractionTab === 'qa' && (
                 <>
                   {messages.filter(m => m.type === 'question').length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center pb-10 opacity-50">
                        <HelpCircle className="w-16 h-16 text-zinc-800 mb-6" />
                        <h3 className="font-serif text-2xl text-white mb-2 tracking-wide">Q&A</h3>
                        <p className="text-zinc-500 text-sm max-w-[250px] font-medium leading-relaxed">Posez vos questions à l'Animateur. Les réponses de valeur seront traitées en live.</p>
                     </div>
                   ) : (
                     messages.filter(m => m.type === 'question').map((msg) => {
                       const timeString = msg.created_at?.toDate 
                         ? new Date(msg.created_at.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                         : '';
                       return (
                         <div key={msg.id} className="flex flex-col items-start space-y-3 mt-6 bg-yellow-500/5 p-6 rounded-[1.5rem] border border-yellow-500/20 relative backdrop-blur-md group">
                           <HelpCircle className="absolute top-6 right-6 w-6 h-6 text-yellow-500/20 group-hover:text-yellow-500/40 transition-colors" />
                           <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">{msg.userName}</span>
                           <p className="text-base text-zinc-100 font-medium leading-relaxed pr-8">{msg.message}</p>
                           {timeString && <span className="block text-[9px] text-yellow-500/50 mt-2 text-right w-full font-bold">{timeString}</span>}
                         </div>
                       );
                     })
                   )}
                 </>
               )}

               {liveInteractionTab === 'schedule' && (
                 <div className="flex flex-col gap-4 py-2">
                    {liveSessions.map(session => (
                      <div key={session.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-5 items-center hover:bg-white/10 transition-colors group cursor-pointer relative overflow-hidden">
                         <div className="w-20 h-20 rounded-[1.25rem] overflow-hidden flex-none relative">
                            <img src={session.image_url || 'https://images.unsplash.com/photo-1507676184212-d0330a1c5068?auto=format&fit=crop&q=80'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-black/20" />
                         </div>
                         <div className="flex-1">
                            <h4 className="text-white font-serif text-lg leading-tight mb-2 pr-4">{session.title}</h4>
                            <div className="flex items-center gap-2 text-yellow-500">
                               <Calendar size={12} />
                               <p className="text-[10px] uppercase tracking-widest font-bold">
                                 {new Date(session.start_time).toLocaleString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                               </p>
                            </div>
                         </div>
                      </div>
                    ))}
                    {liveSessions.length === 0 && (
                      <p className="text-zinc-500 text-center text-sm font-serif italic py-8">Aucune session programmée</p>
                    )}
                 </div>
               )}
             </div>

             {/* INPUT AREA (Reactions & Text Box) */}
             {(liveInteractionTab === 'chat' || liveInteractionTab === 'qa') && (
               <div className="p-4 md:p-6 bg-[#050505] border-t border-white/5 flex flex-col gap-4 relative z-50">
                 
                 {/* Reaction Bar */}
                 {activeLive && (
                   <div className="flex items-center justify-end gap-2 px-1">
                     {['❤️', '👏', '🔥', '✨'].map(emoji => (
                       <button
                         key={emoji}
                         onClick={() => handleSendReaction(emoji)}
                         type="button"
                         className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/5 border border-white/10 hover:bg-yellow-500/20 hover:border-yellow-500/50 active:scale-90 transition-all flex items-center justify-center text-lg md:text-xl shadow-lg"
                       >
                         {emoji}
                       </button>
                     ))}
                   </div>
                 )}

                 {/* Text Input Block */}
                 <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-white/5 border border-white/10 p-2 pl-5 rounded-[2rem] focus-within:border-yellow-600/50 focus-within:bg-white/10 transition-all shadow-inner">
                   <input 
                     type="text" 
                     value={newMessage}
                     onChange={(e) => setNewMessage(e.target.value)}
                     placeholder={liveInteractionTab === 'chat' ? "Envoyer un message..." : "Poser votre question..."}
                     className="flex-1 bg-transparent border-none text-[15px] text-white focus:outline-none placeholder:text-zinc-600 py-3.5"
                   />
                   <button type="submit" disabled={!newMessage.trim() || sendingMessage} className="p-3 mb-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 text-black rounded-full transition-all shadow-[0_0_15px_rgba(202,138,4,0.3)]">
                     <Send size={20} className="ml-0.5" />
                   </button>
                 </form>
               </div>
             )}
          </div>
        </div>
        
        {/* Render modal if triggered inside Live mode */}
        {showAddModal === 'live' && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <div className="bg-[#111] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-serif text-white font-bold">{editingLiveSession ? 'Modifier la session' : 'Nouvelle session live'}</h3>
                 <button onClick={() => { setShowAddModal(null); setEditingLiveSession(null); }} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
               </div>
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 setIsSubmitting(true);
                 const formData = new FormData(e.currentTarget);
                 try {
                   let imageUrl = editingLiveSession ? editingLiveSession.image_url : null;
                   const fileInput = document.querySelector('input[name="coverImage"]') as HTMLInputElement;
                   if (fileInput && fileInput.files && fileInput.files.length > 0) {
                     const file = fileInput.files[0];
                     const uploadResult = await uploadMeditationFile(file);
                     imageUrl = uploadResult.url;
                   }
                   
                   const data: any = {
                     title: formData.get('title'),
                     start_time: formData.get('date'),
                     image_url: imageUrl
                   };
                   
                   if (editingLiveSession) {
                     data.updated_at = serverTimestamp();
                     await updateDoc(doc(db, 'meditation_live_sessions', editingLiveSession.id), data);
                     await logHistory('live_updated', \`A modifié la session Live: \${data.title}\`);
                   } else {
                     data.class_id = id;
                     data.created_by = currentUser?.uid;
                     data.created_at = serverTimestamp();
                     await addDoc(collection(db, 'meditation_live_sessions'), data);
                     await logHistory('live_started', \`A programmé une session Live: \${data.title}\`);
                   }
                   
                   setShowAddModal(null);
                   setEditingLiveSession(null);
                 } catch (err: any) {
                   handleFirestoreError(err, OperationType.WRITE, 'meditation_live_sessions');
                 } finally {
                   setIsSubmitting(false);
                 }
               }} className="space-y-5">
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-2">Titre du live</label>
                   <input name="title" defaultValue={editingLiveSession?.title} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-gold/50 focus:bg-white/10 transition-all font-sans" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-2">Date et heure</label>
                   <input name="date" defaultValue={editingLiveSession?.start_time} required type="datetime-local" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-gold/50 focus:bg-white/10 transition-all font-sans" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-2">Image de couverture (Optionnelle)</label>
                   <div className="relative group cursor-pointer w-full bg-white/5 hover:bg-white/10 border border-dashed border-white/10 hover:border-yellow-500/50 rounded-xl px-4 py-8 text-center transition-all">
                     <Camera className="w-8 h-8 text-gray-400 group-hover:text-yellow-500 mx-auto mb-2 transition-colors" />
                     <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Cliquez pour choisir une image de couverture</span>
                     <input name="coverImage" type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                   </div>
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full font-bold bg-gold hover:bg-yellow-400 text-black py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50 mt-6 font-sans">
                   {isSubmitting ? (editingLiveSession ? 'Mise à jour...' : 'Programmation...') : (editingLiveSession ? 'Enregistrer les modifications' : 'Programmer le Live')}
                 </button>
               </form>
             </div>
          </div>
        )}
      </div>
    );
  }
`;

const finalResult = code.slice(0, startIdx) + newLiveBlock + "\n" + code.slice(endIdx);
fs.writeFileSync('src/pages/SanctumMeditationDetail.tsx', finalResult);
console.log("Successfully replaced");
