# coding: utf-8
import sys, os
if sys.version_info[0] < 3:
    raise Exception("This program must run through Python 3")

import requests
from bs4 import BeautifulSoup
import csv

url = "https://whc.unesco.org/fr/PaysagesCulturels/"
r = requests.get(url)
soup = BeautifulSoup(r.text)

data = []
for country in soup.findAll("div", {"class" : "list_site"}):
    sites = country.findAll('li')
    for site in sites:
        link = site.find('a')
        offset = len('/fr/list/')
        idSite = link['href'][offset:]
        name = link.text
        data.append( {'id':idSite, 'name':name} )


folder = os.path.dirname(__file__)
output = folder + os.sep + 'cultLand.csv'
with open(output, 'w', newline='', encoding="utf8") as f:
    fields = ['id', 'name']
    writer = csv.DictWriter(f, fieldnames=fields, delimiter=';')
    writer.writeheader()
    writer.writerows(data)
