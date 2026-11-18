
      (() => {
        const $ = (s) => document.querySelector(s),
          $$ = (s) => [...document.querySelectorAll(s)],
          clamp = (v) => Math.max(0, Math.min(1, v)),
          seg = (p, a, b) => clamp((p - a) / (b - a)),
          ease = (t) =>
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const story = $("#story"),
          stage = $(".stage"),
          cam = $("#cam"),
          camF = $("#camF"),
          plate = $("#plate"),
          video = $("#push"),
          canvas = $("#cv"),
          ctx = canvas.getContext("2d", { alpha: false }),
          fog = $("#fog"),
          layers = ["#L0", "#L1", "#L2", "#L3", "#L4"].map($),
          acctText =
            "Our ecosystem-level accounting translates complex field science into verifiable, compliance-ready metrics — so you can drive measurable results, not just reports.";
        $("#acct").innerHTML = acctText
          .split(/(\s+)/)
          .map((w) => (w.trim() ? `<span>${w}</span>` : w))
          .join("");
        let W = innerWidth,
          H = innerHeight,
          sp = 0,
          sx = 0,
          sy = 0,
          mx = 0,
          my = 0,
          want = 0,
          shown = -1,
          busy = false,
          frames = [],
          NF = 121,
          cached = 0,
          lastT = 0,
          statsStarted = false;
        function layoutCanvas() {
          W = innerWidth;
          H = innerHeight;
          const d = Math.min(devicePixelRatio || 1, 1.5);
          canvas.width = Math.round(canvas.clientWidth * d);
          canvas.height = Math.round(canvas.clientHeight * d);
        }
        function layoutHero() {
          const hero = $("#heroCopy"),
            line = hero.querySelector("h1"),
            W = innerWidth,
            H = innerHeight;
          if (W < 821) {
            hero.style.top = "";
            line.style.fontSize = "";
            return;
          }
          const bw = W * 1.06,
            bh = H * 1.12,
            k = Math.max(bw / 1600, bh / 900),
            fernTop = -0.09 * H + (bh - 900 * k) / 2 + 245 * k + 0.06 * H;
          let fs = Math.min(104, 72 * k);
          line.style.fontSize = fs + "px";
          if (line.scrollWidth > W * 0.86) {
            fs *= (W * 0.86) / line.scrollWidth;
            line.style.fontSize = fs + "px";
          }
          requestAnimationFrame(() => {
            const blockH = hero.offsetHeight;
            hero.style.top = fernTop + 0.5 * fs - blockH + "px";
          });
        }
        addEventListener("resize", () => {
          layoutCanvas();
          layoutHero();
        });
        document.fonts?.ready.then(layoutHero);
        layoutCanvas();
        layoutHero();
        function coverDraw(bitmap) {
          const cw = canvas.width,
            ch = canvas.height,
            bw = bitmap.width,
            bh = bitmap.height,
            s = Math.max(cw / bw, ch / bh),
            dw = bw * s,
            dh = bh * s;
          ctx.clearRect(0, 0, cw, ch);
          ctx.drawImage(bitmap, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
        }
        function nearest(i) {
          if (frames[i]) return i;
          for (let k = 1; k < NF; k++) {
            if (i - k >= 0 && frames[i - k]) return i - k;
            if (i + k < NF && frames[i + k]) return i + k;
          }
          return -1;
        }
        async function drawWant() {
          if (busy) return;
          const n = nearest(want);
          if (n < 0) return;
          if (n === shown) return;
          busy = true;
          try {
            const bmp = await createImageBitmap(frames[n]);
            coverDraw(bmp);
            bmp.close();
            shown = n;
          } catch (e) {}
          busy = false;
          if (nearest(want) !== shown) drawWant();
        }
        function blobFrame(grab, quality) {
          return new Promise((resolve) =>
            grab.toBlob(resolve, "image/jpeg", quality),
          );
        }
        async function cacheVideo() {
          if (video.dataset.ready) return;
          video.dataset.ready = "1";
          NF = Math.max(2, Math.round(video.duration * 24) || 121);
          frames = new Array(NF);
          const grab = document.createElement("canvas");
          grab.width = 1600;
          grab.height = 900;
          const g = grab.getContext("2d");
          try {
            g.drawImage(video, 0, 0, 1600, 900);
            frames[0] = await blobFrame(grab, 0.9);
            cached = 1;
            drawWant();
          } catch (e) {}
          if ("requestVideoFrameCallback" in video) {
            const step = async (_, meta) => {
              const i = Math.min(NF - 1, Math.round(meta.mediaTime * 24));
              if (i > 0 && !frames[i]) {
                try {
                  g.drawImage(video, 0, 0, 1600, 900);
                  frames[i] = await blobFrame(grab, 0.86);
                  cached++;
                } catch (e) {}
              }
              if (i === want) drawWant();
              if (!video.ended) video.requestVideoFrameCallback(step);
            };
            video.requestVideoFrameCallback(step);
            video.play().catch(() => {});
          } else {
            let i = 1;
            const seek = () => {
              if (i >= NF) return;
              video.currentTime = Math.min(i / 24, video.duration - 0.01);
            };
            video.addEventListener("seeked", async () => {
              try {
                g.drawImage(video, 0, 0, 1600, 900);
                frames[i] = await blobFrame(grab, 0.86);
                cached++;
              } catch (e) {}
              i++;
              seek();
            });
            seek();
          }
        }
        video.addEventListener("loadeddata", cacheVideo, { once: true });
        if (video.readyState >= 2) cacheVideo();
        video.addEventListener("error", () => {
          plate.style.opacity = 1;
        });
        const rocks = $$(".rock");
        $$(".hotspot").forEach((h) =>
          h.addEventListener("click", () => {
            $$(".hotspot").forEach((x) =>
              x.classList.toggle("on", x === h && !h.classList.contains("on")),
            );
          }),
        );
        $$(".feat").forEach((f) =>
          f.addEventListener("click", () => {
            $$(".feat").forEach((x) =>
              x.classList.toggle("on", x === f && !f.classList.contains("on")),
            );
          }),
        );
        $$(".sol-card").forEach((card) => {
          card.addEventListener("pointermove", (e) => {
            const r = card.getBoundingClientRect(),
              x = (e.clientX - r.left) / r.width - 0.5,
              y = (e.clientY - r.top) / r.height - 0.5;
            card.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
          });
          card.addEventListener(
            "pointerleave",
            () => (card.style.transform = ""),
          );
        });
        const statEls = $$(".stat strong");
        function startStats() {
          if (statsStarted) return;
          statsStarted = true;
          const start = performance.now();
          function tick(now) {
            const t = ease(clamp((now - start) / 1600));
            statEls.forEach((el) => {
              const n = Number(el.dataset.count),
                v = n * t,
                d = Number(el.dataset.decimals || 0);
              el.textContent =
                el.dataset.format === "comma"
                  ? Math.round(v).toLocaleString("en-US")
                  : v.toFixed(d);
            });
            if (t < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }
        function frame(now) {
          const dt = Math.min(64, now - (lastT || now));
          lastT = now;
          const rect = story.getBoundingClientRect(),
            p = clamp(-rect.top / (story.offsetHeight - innerHeight));
          sp += (p - sp) * (1 - Math.pow(0.86, dt / 16.7));
          if (Math.abs(p - sp) < 0.0002) sp = p;
          const vp = ease(seg(sp, 0.05, 0.7));
          want = Math.round(vp * (NF - 1));
          drawWant();
          mx = pointerX / innerWidth - 0.5;
          my = pointerY / innerHeight - 0.5;
          sx += (mx - sx) * 0.06;
          sy += (my - sy) * 0.06;
          const camTransform = `translate3d(${-sx * 18}px,${-sy * 12 + (1 - vp) * innerHeight * 0.06}px,0) scale(${1 + 0.02 * (1 - vp)})`;
          cam.style.transform = camTransform;
          camF.style.transform = camTransform;
          const ho = shown < 0 ? 0 : shown === 0 ? seg(sp, 0.06, 0.105) : 1;
          plate.style.opacity = 1 - ho;
          camF.style.opacity = 1 - ho;
          camF.style.visibility = ho < 1 ? "visible" : "hidden";
          plate.style.visibility = ho < 1 ? "visible" : "hidden";
          const h = seg(sp, 0.02, 0.1),
            hero = $("#heroCopy");
          hero.style.transform = `translate3d(${-sx * 10}px,${-h * 80 - sy * 6}px,0) scale(${1 + h * 0.12})`;
          hero.style.filter = `blur(${h * 14}px)`;
          hero.style.opacity = 1 - h;
          layers[0].style.visibility = h >= 1 ? "hidden" : "visible";
          $("#hud").style.transform =
            `translate3d(${sx * 26}px,${sy * 18 - h * 40}px,0)`;
          $("#hud").style.opacity = 1 - seg(sp, 0.02, 0.08);
          $("#caption").style.opacity = 1 - seg(sp, 0.01, 0.05);
          $("#hint").style.opacity = 1 - seg(sp, 0.01, 0.05);
          layers[1].style.visibility = h >= 1 ? "hidden" : "visible";
          const vIn = seg(sp, 0.16, 0.27),
            vOut = seg(sp, 0.34, 0.42),
            vision = $("#vision"),
            words = vision.querySelectorAll("h2 span");
          words.forEach((w, i) => {
            const k = clamp(vIn * 1.6 - i * 0.08);
            w.style.transform = `translate3d(0,${(1 - k) * 30 - vOut * 60}px,0)`;
            w.style.filter = `blur(${(1 - k) * 12 + vOut * 14}px)`;
            w.style.opacity = k * (1 - vOut);
          });
          const vOpacity = clamp(vIn * 2 - 0.6) * (1 - vOut);
          vision.querySelector(".chip").style.opacity = vOpacity;
          vision.querySelector("p").style.opacity = vOpacity;
          vision.querySelector(".chip").style.transform =
            `translateY(${-vOut * 50}px)`;
          vision.querySelector("p").style.transform =
            `translateY(${-vOut * 50}px)`;
          layers[2].style.visibility = vOpacity > 0 ? "visible" : "hidden";
          const fg = ease(seg(sp, 0.38, 0.47));
          fog.style.visibility = fg > 0 ? "visible" : "hidden";
          fog.style.opacity = fg;
          fog.style.transform = `translate3d(${(fg - 1) * 18 + sx * -10}vw,${sy * -6}px,0)`;
          const aIn = seg(sp, 0.45, 0.55),
            aOut = seg(sp, 0.63, 0.68),
            acct = $$("#acct span");
          acct.forEach((w, i) => {
            const k = clamp(aIn * 2.2 - (i / acct.length) * 1.2);
            w.style.opacity = (0.15 + 0.85 * k) * (1 - aOut);
            w.style.filter = `blur(${(1 - k) * 6 + aOut * 10}px)`;
          });
          $$(".hotspot").forEach((hot, i) => {
            const k = seg(sp, 0.49 + i * 0.02, 0.53 + i * 0.02);
            hot.style.transform = `translate3d(${-sx * 30}px,${-sy * 20}px,0) scale(${k * (1 - aOut)})`;
            hot.style.visibility = k * (1 - aOut) > 0 ? "visible" : "hidden";
          });
          layers[3].style.visibility =
            aIn > 0 && aOut < 1 ? "visible" : "hidden";
          const sIn = seg(sp, 0.72, 0.82),
            cred = $("#cred");
          cred.style.opacity = sIn;
          cred.style.transform = `translateY(${(1 - sIn) * 30}px)`;
          cred.style.filter = `blur(${(1 - sIn) * 8}px)`;
          const cIn = ease(seg(sp, 0.74, 0.86)),
            carbon = $("#carbon");
          carbon.style.opacity = cIn;
          carbon.style.transform = `translate3d(${-sx * 14}px,${(1 - cIn) * 60 + sy * -10}px,0) rotateY(${sx * 8}deg) rotateX(${-sy * 8}deg)`;
          $("#carbonNum").textContent = Math.round(24 * seg(sp, 0.76, 0.9));
          const dash = 1 - seg(sp, 0.77, 0.92);
          $("#sparkline").style.strokeDashoffset = 260 * dash;
          $$(".feat").forEach((f, i) => {
            const k = ease(seg(sp, 0.76 + i * 0.025, 0.82 + i * 0.025));
            f.style.opacity = k;
            f.style.transform = `translateX(${(1 - k) * 40}px)`;
          });
          layers[4].style.visibility = sIn > 0 ? "visible" : "hidden";
          $("#progress").style.transform = `scaleX(${sp})`;
          rocks.forEach((r, i) => {
            const fp = seg(sp, 0.02, 0.2),
              fe = fp * fp,
              x = Number(r.dataset.x),
              y = Number(r.dataset.y),
              d = Number(r.dataset.d);
            r.style.transform = `translate3d(${x * fp * 70 - sx * 24 * d}vw,${y * fp * 60 - sy * 16 * d}vh,0) scale(${1 + fe * 1.6 * d})`;
            r.style.filter = `blur(${fe * 5 * d}px)`;
            r.style.opacity = fp >= 1 ? 0 : 1;
          });
          const solTop = $("#sol").getBoundingClientRect().top;
          if (solTop < innerHeight * 0.6) startStats();
          requestAnimationFrame(frame);
        }
        let pointerX = innerWidth / 2,
          pointerY = innerHeight / 2;
        addEventListener(
          "pointermove",
          (e) => {
            pointerX = e.clientX;
            pointerY = e.clientY;
          },
          { passive: true },
        );
        requestAnimationFrame(frame);
      })();