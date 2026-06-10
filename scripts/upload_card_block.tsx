            <CardWrap className={`flex flex-col overflow-hidden ${result ? 'flex-shrink-0' : 'flex-1'}`}>
              <div className="relative px-5 pt-5 flex-shrink-0"
                style={{
                  background: result
                    ? 'linear-gradient(135deg,#059669 0%,#10B981 55%,#34D399 100%)'
                    : detecting
                      ? 'linear-gradient(135deg,#5B21B6 0%,#7C3AED 50%,#8B5CF6 100%)'
                      : 'linear-gradient(135deg,#6D28D9 0%,#7C3AED 50%,#8B5CF6 100%)',
                  paddingBottom: result ? '1.75rem' : detecting ? '2.25rem' : '2rem',
                }}>
                <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full pointer-events-none"
                  style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.18)' }}>
                        {result ? <CheckCircle size={15} color="white" /> : detecting ? <Activity size={15} color="white" /> : <Upload size={15} color="white" />}
                      </div>
                      <p className="text-[14px] font-bold text-white leading-tight">
                        {result ? t('aiDetection.analyzedImage') : detecting ? t('aiDetection.analysing') : t('aiDetection.uploadTitle')}
                      </p>
                    </div>
                    <p className="text-[11px] text-white/65 pl-10 leading-snug">
                      {result
                        ? `${result.confidence.toFixed(1)}% · ${t('aiDetection.detected')}`
                        : detecting
                          ? `${Math.round(progress)}% · ${t('aiDetection.analysingShort')}`
                          : t('aiDetection.uploadSubtitle')}
                    </p>
                  </div>
                  {!result && !detecting && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {['PNG', 'JPG', 'WEBP'].map(f => (
                        <span key={f} className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ background: 'rgba(255,255,255,0.16)', color: 'white', border: '1px solid rgba(255,255,255,0.22)' }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                  {result && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', color: '#FFFFFF' }}>
                      {t('aiDetection.aiVerified')}
                    </span>
                  )}
                  {detecting && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', color: '#FFFFFF' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-white" />
                      {t('aiDetection.analysingShort')}
                    </span>
                  )}
                </div>
              </div>

              <div className={`relative mx-4 mb-4 flex flex-col min-h-0 ${result ? '-mt-3' : '-mt-5 flex-1'}`}>
                <div className={`rounded-2xl bg-background border border-border/60 shadow-sm flex flex-col ${result ? 'p-3 gap-2.5' : detecting ? 'p-4 gap-4 flex-1' : 'p-4 flex-1 gap-3'}`}>
              <div
                onDragOver={e => { if (!result && !detecting) { e.preventDefault(); setDragging(true); } }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { if (!result && !detecting) handleDrop(e); }}
                onClick={() => { if (!detecting) inputRef.current?.click(); }}
                className={`relative border-2 border-dashed rounded-2xl transition-all overflow-hidden flex flex-col ${
                  detecting ? 'cursor-wait' : 'cursor-pointer'
                } ${!result && !detecting ? 'flex-1' : ''}`}
                style={{
                  borderColor: detecting ? '#8B5CF6' : dragging ? '#8B5CF6' : result ? 'rgba(16,185,129,0.35)' : 'rgba(139,92,246,0.28)',
                  background: detecting
                    ? 'rgba(139,92,246,0.08)'
                    : result
                      ? 'rgba(16,185,129,0.04)'
                      : dragging ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.02)',
                  minHeight: !result && !preview && !detecting ? 260 : undefined,
                  boxShadow: detecting ? '0 0 0 3px rgba(139,92,246,0.12)' : undefined,
                }}
                onMouseEnter={e => {
                  if (!dragging && !detecting && !result) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.52)';
                }}
                onMouseLeave={e => {
                  if (!dragging && !detecting) {
                    (e.currentTarget as HTMLElement).style.borderColor = result ? 'rgba(16,185,129,0.35)' : 'rgba(139,92,246,0.28)';
                  }
                }}
              >
                {preview ? (
                  <div className={`relative ${result ? 'p-2' : ''}`}>
                    <img src={preview} alt="Preview"
                      className={`w-full rounded-xl object-contain mx-auto ${result ? 'max-h-28' : detecting ? 'max-h-40 p-2' : 'max-h-52 p-2'}`} />
                    {detecting && (
                      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-violet-500/10 animate-pulse" />
                        <div className="absolute inset-x-4 top-1/2 h-0.5 rounded-full"
                          style={{ background: 'linear-gradient(90deg,transparent,#8B5CF6,transparent)' }} />
                      </div>
                    )}
                    {!detecting && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl"
                        style={{ background: 'rgba(0,0,0,0.45)' }}>
                        <div className="text-center text-white">
                          <Camera size={result ? 16 : 20} className="mx-auto mb-1" />
                          <p className="text-[11px] font-semibold">{t('aiDetection.clickToChange')}</p>
                        </div>
                      </div>
                    )}
                    {result && !detecting && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white"
                        style={{ background: 'rgba(16,185,129,0.9)' }}>
                        ✓ {t('aiDetection.detected')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.1))' }}>
                        <Upload size={26} color="#8B5CF6" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#8B5CF6,#06B6D4)' }}>
                        <span className="text-white text-[10px] font-black">+</span>
                      </div>
                    </div>
                    <p className="text-[15px] font-bold text-foreground">{t('aiDetection.dropTitle')}</p>
                    <p className="text-[12px] text-muted-foreground mt-1">{t('aiDetection.dropHint')}</p>
                    <div className="flex items-center gap-3 mt-4">
                      {[
                        { icon: '🖼️', text: t('aiDetection.dropFormats') },
                        { icon: '📦', text: t('aiDetection.dropMaxSize') },
                      ].map(b => (
                        <span key={b.text} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground px-2.5 py-1 rounded-lg bg-muted">
                          {b.icon} {b.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

              {file && (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{
                    background: result ? 'rgba(16,185,129,0.08)' : detecting ? 'rgba(139,92,246,0.09)' : 'rgba(139,92,246,0.07)',
                    border: result ? '1px solid rgba(16,185,129,0.22)' : '1px solid rgba(139,92,246,0.18)',
                  }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: result ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)' }}>
                      {result ? <CheckCircle size={13} color="#10B981" /> : <Camera size={13} color="#8B5CF6" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-foreground truncate max-w-[180px]">{file.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB ·{' '}
                        {result
                          ? `${result.confidence.toFixed(1)}% ${t('aiDetection.detected').toLowerCase()}`
                          : detecting
                            ? t('aiDetection.analysingShort')
                            : t('aiDetection.readyToDetect')}
                      </p>
                    </div>
                  </div>
                  {!result && !detecting && (
                    <button onClick={e => { e.stopPropagation(); reset(); }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ml-2 transition-colors text-sm cursor-pointer">✕</button>
                  )}
                </div>
              )}

              {detecting && (
                <div className="rounded-xl p-4 flex-1 flex flex-col justify-center"
                  style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full animate-ping inline-block" style={{ background: '#8B5CF6', opacity: 0.6 }} />
                      {t('aiDetection.analysing')}
                    </span>
                    <span className="text-[13px] font-black" style={{ color: '#8B5CF6' }}>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#8B5CF6,#06B6D4)' }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center leading-snug">
                    {t('aiDetection.awaitingDesc')}
                  </p>
                </div>
              )}

              {!result && !detecting ? (
                <>
                  <div className="flex gap-2">
                    <button onClick={handleDetect} disabled={!file}
                      className="flex-1 py-3 rounded-xl text-white text-[13.5px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(135deg,#7C3AED,#2563EB)',
                        boxShadow: file ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
                      }}>
                      <Zap size={15} />{t('aiDetection.detectSign')}
                    </button>
                    {file && (
                      <button onClick={reset}
                        className="w-12 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-300 transition-colors cursor-pointer">
                        <RefreshCw size={15} />
                      </button>
                    )}
                  </div>

                  <div className="border-t border-border pt-4 flex-shrink-0">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                      {t('aiDetection.catalogTap')}
                    </p>
                    {loadingStats ? (
                      <div className="grid grid-cols-4 gap-2">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                        ))}
                      </div>
                    ) : pageStats && pageStats.sample_signs.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {pageStats.sample_signs.slice(0, 4).map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSampleSign(s)}
                            className="flex flex-col items-center gap-1.5 cursor-pointer group"
                          >
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[11px] font-black overflow-hidden transition-all group-hover:scale-110 group-hover:shadow-md"
                              style={{
                                background: `${s.color}15`,
                                border: `1.5px solid ${s.color}35`,
                                color: s.color,
                              }}>
                              {s.image ? (
                                <img src={s.image} alt={s.sign_name} className="w-full h-full object-cover" />
                              ) : (
                                s.label
                              )}
                            </div>
                            <p className="text-[10.5px] text-muted-foreground text-center leading-tight line-clamp-2">
                              {s.sign_name}
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-muted-foreground">{t('aiDetection.catalogEmpty')}</p>
                    )}
                  </div>
                </>
              ) : result ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex-1 py-2.5 rounded-xl text-[12.5px] font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <Camera size={13} /> {t('aiDetection.clickToChange')}
                  </button>
                  <button onClick={reset}
                    className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-red-500 hover:border-red-300 transition-colors flex items-center justify-center gap-2 cursor-pointer text-[12.5px] font-semibold">
                    <RefreshCw size={13} /> {t('aiDetection.detectAnother')}
                  </button>
                </div>
              ) : null}
                </div>
              </div>
            </CardWrap>
