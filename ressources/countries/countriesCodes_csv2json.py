# coding: utf-8
import sys
if sys.version_info[0] < 3:
    raise Exception("This program must run through Python 3")

import csv, os, json

if __name__ == '__main__':
    folder = os.path.dirname(__file__)
    input = folder + os.sep + 'countries_codes.csv'
    with open(input, 'r', newline='', encoding="utf8") as f:
        reader = csv.DictReader(f, delimiter=',')
        data = {}
        for row in reader:
            iso = row['alpha2']
            data[iso] = {'en':row['en_name'], 'fr':row['fr_name'], 'es':row['es_name']}

    output = folder + os.sep + 'countries_codes.json'
    with open(output, 'w', encoding="utf8") as f:
        f.write(json.dumps(data, indent=4))
