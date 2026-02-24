import json
import os
import sys
import time
import urllib.parse
import re
try:
    import undetected_chromedriver as uc
except ModuleNotFoundError as e:
    if "distutils" in str(e):
        import types, re
        class LooseVersion:
            def __init__(self, v):
                s = str(v)
                self.vstring = s
                self.version = self._split(s)
            def _split(self, s):
                parts = re.split(r"[.\-+_]", s)
                res = []
                for p in parts:
                    if not p:
                        continue
                    if p.isdigit():
                        res.append(int(p))
                    else:
                        res.append(p)
                return res
            def _cmp(self, other):
                o = other if isinstance(other, LooseVersion) else LooseVersion(other)
                a, b = self.version, o.version
                for x, y in zip(a, b):
                    if x == y:
                        continue
                    try:
                        return -1 if x < y else 1
                    except Exception:
                        xs, ys = str(x), str(y)
                        if xs == ys:
                            continue
                        return -1 if xs < ys else 1
                if len(a) == len(b):
                    return 0
                return -1 if len(a) < len(b) else 1
            def __lt__(self, other): return self._cmp(other) < 0
            def __le__(self, other): return self._cmp(other) <= 0
            def __gt__(self, other): return self._cmp(other) > 0
            def __ge__(self, other): return self._cmp(other) >= 0
            def __eq__(self, other): return self._cmp(other) == 0
            def __ne__(self, other): return self._cmp(other) != 0
        distutils_mod = types.ModuleType("distutils")
        distutils_version_mod = types.ModuleType("distutils.version")
        distutils_version_mod.LooseVersion = LooseVersion
        sys.modules["distutils"] = distutils_mod
        sys.modules["distutils.version"] = distutils_version_mod
        import undetected_chromedriver as uc
    else:
        raise
from selenium import webdriver
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import csv


def create_driver():
    profile_dir = os.path.join(os.getcwd(), "chrome-profile")
    try:
        options = uc.ChromeOptions()
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--lang=zh-CN")
        options.add_argument(f"--user-data-dir={profile_dir}")
        return uc.Chrome(options=options)
    except Exception:
        eo = EdgeOptions()
        eo.add_argument("--lang=zh-CN")
        eo.add_argument(f"--user-data-dir={profile_dir}")
        return webdriver.Edge(options=eo)


def wait_for_login(driver, timeout=300):
    start = time.time()
    while True:
        url = driver.current_url or ""
        if "login.taobao.com" not in url and "sec.taobao.com" not in url:
            try:
                WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "body"))
                )
                return
            except Exception:
                pass
        if time.time() - start > timeout:
            return
        time.sleep(1)


def open_search_page(driver, keyword):
    q = urllib.parse.quote_plus(keyword)
    url = f"https://s.taobao.com/search?q={q}"
    driver.get(url)
    if "login.taobao.com" in (driver.current_url or ""):
        print("请在浏览器中使用手机淘宝扫码登录")
        wait_for_login(driver, timeout=600)


def _first(element, selectors):
    for sel in selectors:
        try:
            node = element.find_element(By.CSS_SELECTOR, sel)
            if node:
                t = (node.get_attribute("title") or node.text or "").strip()
                if t:
                    return t
        except Exception:
            continue
    return ""


def _find_items_root(driver):
    roots = [
        "#mainsrp-itemlist",
        "div[data-spm*='itemlist']",
        "div[class*='itemlist']",
        "div#J_ItemList",
    ]
    for r in roots:
        try:
            node = driver.find_element(By.CSS_SELECTOR, r)
            if node:
                return node
        except Exception:
            continue
    return driver


def extract_items(driver, limit=None):
    root = _find_items_root(driver)
    lists = [
        ".items .item",
        ".item.J_MouserOnverReq",
        ".grid .grid-item",
        "div[class*='item']",
        "div[data-index]",
    ]
    items = []
    found = []
    for sel in lists:
        try:
            found = root.find_elements(By.CSS_SELECTOR, sel)
            if len(found) > 0:
                break
        except Exception:
            continue
    for el in found:
        anchor = None
        title = _first(
            el,
            [
                ".title a",
                ".title",
                ".productTitle a",
                "a[href][target]",
            ],
        )
        try:
            candidates = [
                ".title a[href]",
                ".productTitle a[href]",
                "a[href][target]",
            ]
            for c in candidates:
                try:
                    anchor = el.find_element(By.CSS_SELECTOR, c)
                    if anchor:
                        break
                except Exception:
                    continue
        except Exception:
            anchor = None
        price = _first(
            el,
            [
                ".price strong",
                ".g_price strong",
                ".productPrice em",
                ".price",
            ],
        )
        sales = _first(
            el,
            [
                ".deal-cnt",
                ".status em",
                ".sale-num",
                ".sales .value",
            ],
        )
        href = ""
        try:
            if anchor:
                href = anchor.get_attribute("href") or ""
        except Exception:
            href = ""
        if href and href.startswith("//"):
            href = "https:" + href
        if any([title, price, sales, href]):
            items.append(
                {
                    "title": title,
                    "price": price,
                    "sales": sales,
                    "url": href,
                }
            )
        if limit and len(items) >= limit:
            break
    return items


def wait_items(driver, timeout=30):
    locators = [
        (By.CSS_SELECTOR, "#mainsrp-itemlist"),
        (By.CSS_SELECTOR, ".items .item"),
        (By.CSS_SELECTOR, ".grid .grid-item"),
    ]
    end = time.time() + timeout
    for by, sel in locators:
        try:
            WebDriverWait(driver, max(3, int(end - time.time()))).until(
                EC.presence_of_element_located((by, sel))
            )
            return
        except Exception:
            continue


def _parse_sales(s):
    if not s:
        return 0
    t = str(s).strip()
    t = re.sub(r"[+,，\\s]|人付款|人收货|笔交易|已售|销量|月销", "", t)
    m = re.search(r"([0-9]+(?:\\.[0-9]+)?)\\s*(万|w|W)?", t)
    if not m:
        return 0
    num = float(m.group(1))
    unit = m.group(2) or ""
    if unit in ["万", "w", "W"]:
        num *= 10000
    return int(num)


def _get_specs_from_detail(driver, url, timeout=20):
    if not url:
        return ""
    try:
        driver.execute_script("window.open(arguments[0],'_blank');", url)
        wnd = driver.window_handles[-1]
        driver.switch_to.window(wnd)
        selectors = [
            "#J_AttrUL li",
            "ul#J_AttrUL li",
            ".attributes-list li",
            ".attr-list li",
            ".tm-attrlist .tm-clear li",
        ]
        end = time.time() + timeout
        found = []
        for sel in selectors:
            try:
                WebDriverWait(driver, max(2, int(end - time.time()))).until(
                    EC.presence_of_all_elements_located((By.CSS_SELECTOR, sel))
                )
                found = driver.find_elements(By.CSS_SELECTOR, sel)
                if found:
                    break
            except Exception:
                continue
        texts = [x.text.strip() for x in found if (x.text or "").strip()]
        keys = ["规格", "净含量", "重量", "口味", "包装", "产地"]
        picked = []
        for t in texts:
            for k in keys:
                if k in t:
                    picked.append(t)
                    break
        result = "；".join(dict.fromkeys(picked)) if picked else ""
        try:
            driver.close()
        finally:
            if driver.window_handles:
                driver.switch_to.window(driver.window_handles[0])
        return result
    except TimeoutException:
        try:
            driver.close()
        finally:
            if driver.window_handles:
                driver.switch_to.window(driver.window_handles[0])
        return ""
    except Exception:
        try:
            driver.close()
        finally:
            if driver.window_handles:
                driver.switch_to.window(driver.window_handles[0])
        return ""


def _normalize_price(p):
    t = (p or "").strip()
    t = re.sub(r"[￥¥]", "", t)
    t = t.replace(",", "")
    m = re.search(r"([0-9]+(?:\\.[0-9]+)?)", t)
    return m.group(1) if m else t


def save_top3_csv(keyword, items):
    out_dir = os.path.join(os.getcwd(), "output")
    try:
        os.makedirs(out_dir, exist_ok=True)
    except Exception:
        pass
    name = f"top3_{keyword}.csv"
    fp = os.path.join(out_dir, name)
    with open(fp, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["标题", "价格", "销量", "规格", "链接"])
        for it in items:
            writer.writerow([
                it.get("title", ""),
                it.get("price", ""),
                it.get("sales", ""),
                it.get("spec", ""),
                it.get("url", ""),
            ])
    return fp


def main():
    keyword = "手机"
    if len(sys.argv) > 1:
        keyword = " ".join(sys.argv[1:])
    driver = create_driver()
    try:
        open_search_page(driver, keyword)
        wait_items(driver, timeout=30)
        data = extract_items(driver, limit=80)
        for it in data:
            it["sales_num"] = _parse_sales(it.get("sales", ""))
        data = [x for x in data if x.get("title")]
        data.sort(key=lambda x: x.get("sales_num", 0), reverse=True)
        top3 = data[:3]
        for it in top3:
            it["price"] = _normalize_price(it.get("price", ""))
            it["spec"] = _get_specs_from_detail(driver, it.get("url", ""))
        fp = save_top3_csv(keyword, top3)
        print(json.dumps({"file": fp, "items": top3}, ensure_ascii=False, indent=2))
    finally:
        pass


if __name__ == "__main__":
    main()
