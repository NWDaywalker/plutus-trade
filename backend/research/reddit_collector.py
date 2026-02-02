"""
Reddit Research Collector
Scrapes relevant subreddits for prediction market intelligence
"""

import httpx
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Optional

from .engine import (
    ResearchItem, ResearchDatabase, SourceType, Category,
    generate_item_id, calculate_engagement_score, 
    analyze_sentiment_keywords, extract_keywords
)

SUBREDDIT_CONFIG = {
      Category.POLITICS: [
                {"name": "politics", "weight": 1.0},
                {"name": "PoliticalDiscussion", "weight": 1.2},
                {"name": "news", "weight": 0.8},
                {"name": "Conservative", "weight": 1.0},
                {"name": "moderatepolitics", "weight": 1.3},
      ],
      Category.SPORTS: [
                {"name": "sports", "weight": 1.0},
                {"name": "nfl", "weight": 1.2},
                {"name": "nba", "weight": 1.2},
                {"name": "sportsbook", "weight": 1.5},
      ],
      Category.CRYPTO: [
                {"name": "CryptoCurrency", "weight": 1.2},
                {"name": "Bitcoin", "weight": 1.3},
                {"name": "ethereum", "weight": 1.2},
                {"name": "CryptoMarkets", "weight": 1.4},
      ],
      Category.ENTERTAINMENT: [
                {"name": "movies", "weight": 1.0},
                {"name": "Oscars", "weight": 1.5},
                {"name": "boxoffice", "weight": 1.4},
      ],
}

UNIVERSAL_SUBREDDITS = [
      {"name": "polymarket", "weight": 2.0},
      {"name": "Metaculus", "weight": 1.8},
]


class RedditCollector:
      BASE_URL = "https://www.reddit.com"

    def __init__(self, db: ResearchDatabase):
              self.db = db
              self.client = httpx.AsyncClient(
                  headers={"User-Agent": "PolymarketResearch/1.0"},
                  timeout=30.0
              )

    async def close(self):
              await self.client.aclose()

    async def fetch_subreddit(self, subreddit: str, sort: str = "hot", limit: int = 25) -> List[Dict]:
              url = f"{self.BASE_URL}/r/{subreddit}/{sort}.json"
              try:
                            response = await self.client.get(url, params={"limit": limit})
                            response.raise_for_status()
                            data = response.json()
                            return [child.get("data", {}) for child in data.get("data", {}).get("children", [])]
except Exception as e:
            print(f"Error fetching r/{subreddit}: {e}")
            return []

    def _parse_post(self, post: Dict, category: Category, weight: float) -> Optional[ResearchItem]:
              try:
                            if post.get("removed_by_category"):
                                              return None
                                          created_utc = post.get("created_utc", 0)
                            post_time = datetime.fromtimestamp(created_utc, tz=timezone.utc)
                            hours_old = (datetime.now(timezone.utc) - post_time).total_seconds() / 3600
                            if hours_old > 168:
                                              return None

                            title = post.get("title", "")
                            content = f"{title}\n\n{post.get('selftext', '')}".strip()
                            url = f"https://reddit.com{post.get('permalink', '')}"

            return ResearchItem(
                              id=generate_item_id("reddit", url, title),
                              source_type=SourceType.REDDIT,
                              source_name=f"r/{post.get('subreddit', 'unknown')}",
                              category=category,
                              title=title,
                              content=content[:5000],
                              url=url,
                              author=post.get("author", "unknown"),
                              timestamp=post_time.isoformat(),
                              upvotes=post.get("ups", 0),
                              comments=post.get("num_comments", 0),
                              engagement_score=calculate_engagement_score(
                                                    post.get("ups", 0), post.get("num_comments", 0), hour"s"_"o
                                lRde,d dwieti gRhets
                                e a r c h   C o l l e c t o r 
                                 S)c,r
              a p e s   r e l e v a n t   s u bsreendtdiimtesn tf=oarn aplryezdei_csteinotni mmeanrtk_ekte yiwnotredlsl(icgoenntceen
                                                                                                                        t")","
                                                                                                                        
                                                                                                                         
                                                                                                                         i m p o r t   h t t p x 
                                                                                                                          i mkpeoyrwto radssy=necxitor
                                                                                                                          afcrto_mk edyawtoertdism(ec oinmtpeonrtt,  dcaatteetgiomrey,) ,t
                                                                                                                          i m e z o n e 
                                                                                                                           f r o m  )t
                                                                                                                           y p i n g   i m peoxrcte pLti sEtx,c eDpitcito,n  Oapst ieo:n
                                                                                                                           a l 
                                                                                                                            
                                                                                                                             f r o m   . e n gpirnien ti(mfp"oErrtr o(r
                                                                                                                               p a r sRiensge aprocshtI:t e{me,} "R)e
                                                                                                                               s e a r c h D a t a b a sree,t uSronu rNcoenTey
                                                                                                                               p e ,   C
                                                                                                                               a t e g oarsyy,n
                                                                                                                               c   d e fg ecnoelrlaetcet__ictaetme_giodr,y (csaellcfu,l actaet_eegnograyg:e mCeantte_gsocroyr)e ,- >
                                                                                                                                 L i s ta[nRaelsyezaer_csheIntteimm]e:n
                                                                                                                                 t _ k e y w o r dist,e mesx t=r a[c]t
                                                                                                                                 _ k e y w o r d ss
                                                                                                                                 u)b
                                                                                                                                 r
                                                                                                                                 eSdUdBiRtEsD D=I TS_UCBORNEFDIDGI T=_ C{O
                                                                                                                                 N F I G .Cgaette(gcoartye.gPoOrLyI,T I[C]S):  +[ 
                                                                                                                                 U N I V E R S A L{_"SnUaBmReE"D:D I"TpSo
                                                                                                                                 l i t i c s " ,  
                                                                                                                                 " w e i g h t " :f o1r. 0s}u,b
                                                                                                                                   i n   s u b r e{d"dniatmse:"
                                                                                                                                   :   " P o l i t i c a l Dpiossctuss s=i oanw"a,i t" wseeilgfh.tf"e:t c1h._2s}u,b
                                                                                                                                   r e d d i t ( s u{b"[n"anmaem"e:" ]",n e"whso"t," ," w1e5i)g
                                                                                                                                   h t " :   0 . 8 } , 
                                                                                                                                       f o r   p o s{t" nianm ep"o:s t"sC:o
                                                                                                                                       n s e r v a t i v e " ,   " w e iigthetm" :=  1s.e0l}f,.
                                                                                                                                       _ p a r s e _ p o{s"tn(apmoes"t:,  "cmaotdeegroartye,p osluibt[i"cwse"i,g h"tw"e]i)g
                                                                                                                                       h t " :   1 . 3 } , 
                                                                                                                                                ] ,i
                                                                                                                                                f   i t eCma:t
                                                                                                                                                e g o r y . S P O R T S :   [ 
                                                                                                                                                          i t e m{s".naapmpee"n:d ("istpeomr)t
                                                                                                                                                          s " ,   " w e i g h t " :a w1a.i0t} ,a
                                                                                                                                                          s y n c i o . s l{e"enpa(m0e."5:) 
                                                                                                                                                          " n f l " ,   " w
                                                                                                                                                          e i g h t " :   1s.e2e}n, 
                                                                                                                                                          =   s e t ( ) 
                                                                                                                                                            { " n a m e " :r e"tnubran" ,[ i" wfeoirg hit "i:n  1i.t2e}m,s
                                                                                                                                                              i f   n o t   ({i".niadm ei"n:  s"esepno rotrs bsoeoekn".,a d"dw(eii.gihdt)"):] 
                                                                                                                                                              1 . 5 } ,
                                                                                                                                                              
                                                                                                                                                                      a]s,y
                                                                                                                                                                      n c   d eCfa tceoglolreyc.tC_RaYlPlT(Os:e l[f
                                                                                                                                                                      )   - >   D i c t{["Cnaatmeeg"o:r y",C rLyipstto[CRuersreeanrccyh"I,t e"mw]e]i:g
                                                                                                                                                                      h t " :   1 . 2 }r,e
                                                                                                                                                                      s u l t s   =   {{}"
                                                                                                                                                                      n a m e " :   " Bfiotrc ociant"e,g o"rwye iignh tC"a:t e1g.o3r}y,:
                                                                                                                                                                      
                                                                                                                                                                                      { " n a mper"i:n t"(eft"h e rReeudmd"i,t :" wCeoilglhetc"t:i n1g. 2{}c,a
                                                                                                                                                                                      t e g o r y . v a{l"unea}m.e.".:" )"
                                                                                                                                                                                      C r y p t o M a r k e t si"t,e m"sw e=i gahwta"i:t  1s.e4l}f,.
                                                                                                                                                                                      c o l l e]c,t
                                                                                                                                                                                      _ c a t eCgaotreyg(ocrayt.eEgNoTrEyR)T
                                                                                                                                                                                      A I N M E N T :   [ 
                                                                                                                                                                                          r e s u l t s{["cnaatmeeg"o:r y"]m o=v iietse"m,s 
                                                                                                                                                                                          " w e i g h t " :   1 . 0f}o,r
                                                                                                                                                                                            i t e m   i n  {i"tneammse:"
                                                                                                                                                                                            :   " O s c a r s " ,   " w e i gshetl"f:. d1b..5s}t,o
                                                                                                                                                                                            r e _ r e s e a r{c"hn_aimtee"m:( i"tbeomx)o
                                                                                                                                                                                            f f i c e " ,   " w e i gphrti"n:t (1f."4 } , 
                                                                                                                                                                                              F o u n]d, 
                                                                                                                                                                                              {}l
                                                                                                                                                                                              e
                                                                                                                                                                                              nU(NiItVeEmRsS)A}L _iStUeBmRsE"D)D
                                                                                                                                                                                              I T S   =   [ 
                                                                                                                                                                                                r e t u{r"nn armees"u:l t"spolymarket", "weight": 2.0},
                                                                                                                                                                                                    {"name": "Metaculus", "weight": 1.8},
                                                                                                                                                                                                    ]
                                                                                                                                                                                                    
                                                                                                                                                                                                    
                                                                                                                                                                                                    class RedditCollector:
                                                                                                                                                                                                        BASE_URL = "https://www.reddit.com"
                                                                                                                                                                                                            
                                                                                                                                                                                                                def __init__(self, db: ResearchDatabase):
                                                                                                                                                                                                                        self.db = db
                                                                                                                                                                                                                                self.client = httpx.AsyncClient(
                                                                                                                                                                                                                                            headers={"User-Agent": "PolymarketResearch/1.0"},
                                                                                                                                                                                                                                                        timeout=30.0
                                                                                                                                                                                                                                                                )
                                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                        async def close(self):
                                                                                                                                                                                                                                                                                await self.client.aclose()
                                                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                                        async def fetch_subreddit(self
