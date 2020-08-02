# coding: utf-8
import sys
if sys.version_info[0] < 3:
    raise Exception("This program must run through Python 3")

import requests
from bs4 import BeautifulSoup
#https://code.tutsplus.com/fr/tutorials/scraping-webpages-in-python-with-beautiful-soup-the-basics--cms-28211
# <tag attribute=value>text</tag>tail

import threading
import queue

import logging
logging.basicConfig(level=logging.getLevelName('INFO'))

import csv, os

class WHC_Scraper():

    def __init__(self, sites, output):
        #Seed the queue
        self.jobs = queue.Queue()
        [self.jobs.put(s) for s in sites]
        self.nJobs = self.jobs.qsize()
        self.cptSites = 0

    def start(self, nbThreads=4):
        with open(output, 'w', newline='', encoding="utf8") as f:
            fields = ['site', 'id', 'description', 'date', 'author', 'copyright', 'license', 'conditions', 'url', 'thumb']
            self.writer = csv.DictWriter(f, fieldnames=fields, delimiter=';')
            self.writer.writeheader()
            threads = []
            for i in range(nbThreads):
                t = threading.Thread(target=self.scrap)
                t.setDaemon(True)
                threads.append(t)
                t.start()
            for t in threads:
                t.join()

    def scrap(self):
        '''Worker'''
        while not self.jobs.empty(): #empty is True if all item was get but it not tell if all task was done
            site = self.jobs.get()
            with threading.RLock():
                self.cptSites += 1
                logging.info('[{}/{}] Processing site {}...'.format(self.cptSites, self.nJobs, site))
            url = 'https://whc.unesco.org/en/list/{}/gallery/maxrows=100'.format(site)
            r = requests.get(url)
            soup = BeautifulSoup(r.text)
            cptPhotos = 0
            for img in soup.findAll("a", {"property" : "image"}):
                cptPhotos += 1
                url2 = 'https://whc.unesco.org' + img['href']
                r2 = requests.get(url2)
                params = {kv.split('=')[0]:kv.split('=')[1] for kv in url2.split('?')[1].split('&')}
                id = params['id']
                soup2 = BeautifulSoup(r2.text)
                data = {}
                data['site'] = site
                data['id'] = id
                data['url'] = 'https://whc.unesco.org/document/{}'.format(id)
                data['thumb'] = 'https://whc.unesco.org' + soup2.findAll("img", {"class": "bordered"})[0]['src']
                for strong in soup2.find_all('strong'):
                    #data[strong.text.strip()] = strong.findNextSibling(text=True).strip()
                    if strong.text.startswith("Description"):
                        data['description'] = strong.findNextSibling(text=True).strip()
                    if strong.text.startswith("Date"):
                        data['date'] = strong.findNextSibling(text=True).strip()
                    if strong.text.startswith("Author"):
                        data['author'] = strong.findNextSibling(text=True).strip()
                    if strong.text.startswith("Copyright"):
                        data['copyright'] = strong.findNextSibling(text=True).strip()
                    if strong.text.startswith("Read the License"):
                        data['license'] = strong.findNextSibling().text
                    if strong.text.startswith("Condition"):
                        conditions = []
                        for condition in strong.next_siblings:
                            if condition.name is None:
                                continue
                            elif condition.name == 'span':
                                conditions.append(condition.text.strip())
                            elif condition.name == 'br':
                                break
                        data['conditions'] = ', '.join(conditions)

                with threading.RLock():
                    self.writer.writerow(data)
            logging.info('> Found {} photos for site {}'.format(cptPhotos, site))
            self.jobs.task_done() #it's just a count of finished tasks used by join() to know if the work is finished


if __name__ == '__main__':
    folder = os.path.dirname(__file__)
    whc = folder + os.sep + 'WHC2019.csv'
    with open(whc, 'r', newline='', encoding="utf8") as f:
        reader = csv.DictReader(f, delimiter=';')
        sites = [row['id_number'] for row in reader]
    #sites = [1133, 1153] #testing
    output = folder + os.sep + 'whc_photos.csv'
    scraper = WHC_Scraper(sites, output)
    scraper.start()




"""
site 1133

https://whc.unesco.org/en/list/1133/gallery/

<a href="/include/tool_image.cfm?id=122806&gallery=site&id_site=1133" class="lightbox" property="image">
<img data-src="/uploads/thumbs/site_1133_0016-360-360-20171214123932.jpg" class="unveil icaption-img" title="&copy; UNESCO / Patricia Alberth " style="width:100%" />

https://whc.unesco.org//uploads/thumbs/site_1133_0016-360-360-20171214123932.jpg



https://whc.unesco.org/include/tool_image.cfm?id=122806&gallery=site&id_site=1133
https://whc.unesco.org/en/documents/122806


https://whc.unesco.org/document/122806
>> site_1133_0016.jpg
"""
