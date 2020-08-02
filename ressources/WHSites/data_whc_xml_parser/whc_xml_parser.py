import xml.etree.ElementTree as ET
import csv
from bs4 import BeautifulSoup

path = '/media/domlysz/KINGSTON/whc-en.xml'
out = '/media/domlysz/KINGSTON/whc-en.csv'
tree = ET.parse(path)
root = tree.getroot()

fields = [elem.tag for elem in root[0]]

with open(out, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fields, delimiter=';')
    writer.writeheader()
    for row in root:
        values = {elem.tag:elem.text for elem in row}

        if values['short_description']:
            values['short_description'] =  BeautifulSoup(values['short_description']).get_text()
        if values['justification']:
            values['justification'] =  BeautifulSoup(values['short_description']).get_text()

        writer.writerow(values)
